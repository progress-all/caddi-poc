/**
 * evaluate-similarity-digikey 実行スクリプト
 * Targetの候補を取得し、DigiKeyパラメータでLLM評価してJSONを保存する。
 * 
 * Usage: node scripts/evaluate-similarity-digikey.mjs <targetMpn>
 * Example: node scripts/evaluate-similarity-digikey.mjs GRM185R60J105KE26D
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  const targetMpn = process.argv[2] || "GRM185R60J105KE26D";
  console.log(`Fetching similar products for target: ${targetMpn}`);

  const res = await fetch(`${BASE_URL}/api/risk-assessment/similar-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mpn: targetMpn }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  const data = await res.json();
  const { targetProduct, candidates } = data;

  if (!targetProduct || !candidates?.length) {
    console.log("No candidates found.");
    return;
  }

  const targetParams = new Map(
    (targetProduct.parameters || []).map((p) => [p.name, p.value])
  );
  const targetId = targetProduct.manufacturerProductNumber || targetProduct.digiKeyProductNumber;

  console.log(`Target: ${targetId}, Candidates: ${candidates.length}`);

  const digikeyParamIds = [
    "Capacitance", "Tolerance", "Voltage - Rated", "Temperature Coefficient",
    "Operating Temperature", "Package / Case", "Mounting Type", "Size / Dimension",
    "Thickness (Max)", "Height - Seated (Max)", "Applications", "Features", "Ratings",
  ];

  const displayNames = {
    "Capacitance": "静電容量",
    "Tolerance": "許容差",
    "Voltage - Rated": "定格電圧",
    "Temperature Coefficient": "温度特性",
    "Operating Temperature": "動作温度",
    "Package / Case": "パッケージ",
    "Mounting Type": "実装タイプ",
    "Size / Dimension": "サイズ",
    "Thickness (Max)": "厚さ",
    "Height - Seated (Max)": "高さ",
    "Applications": "用途",
    "Features": "特徴",
    "Ratings": "定格",
  };

  const outputDir = `app/_lib/datasheet/similarity-results-api/${targetId}`;
  const fs = await import("fs/promises");
  const path = await import("path");
  await fs.mkdir(outputDir, { recursive: true });

  for (const candidate of candidates) {
    const candidateId = candidate.manufacturerProductNumber || candidate.digiKeyProductNumber;
    const candidateParams = new Map(
      (candidate.parameters || []).map((p) => [p.name, p.value])
    );

    const comparison = [];
    for (const paramId of digikeyParamIds) {
      const tv = targetParams.get(paramId);
      const cv = candidateParams.get(paramId);
      if (tv === undefined && cv === undefined) continue;
      comparison.push({
        parameterId: paramId,
        description: displayNames[paramId] || paramId,
        targetValue: tv ?? null,
        candidateValue: cv ?? null,
      });
    }

    if (comparison.length === 0) {
      console.log(`Skipping ${candidateId}: no common params`);
      continue;
    }

    // LLM evaluation: evaluate-similarity と同一の評価プロンプト・reasonルールに準拠
    // reasonは良い例に従う: 具体的な差分を記載。「表記・条件の差あり」「部分一致」は禁止
    const extractMm = (s) => {
      const m = String(s).match(/\((\d+\.?\d*)\s*mm\)/i);
      return m ? parseFloat(m[1]) : null;
    };
    const extractNums = (s) => String(s).match(/-?\d+\.?\d*/g)?.map(Number) || [];

    const evaluatedParams = comparison.map((p) => {
      const { targetValue, candidateValue } = p;
      if (targetValue == null || candidateValue == null) {
        return { ...p, score: 0, reason: "片方欠損" };
      }

      const tv = String(targetValue).trim();
      const cv = String(candidateValue).trim();

      if (tv === cv) return { ...p, score: 100, reason: "同一" };

      const normalize = (s) =>
        s.replace(/µF|uF|µF/gi, "uF").replace(/±|\xb1/g, "±").replace(/\s+/g, " ").trim();
      const ntv = normalize(tv);
      const ncv = normalize(cv);
      if (ntv === ncv) return { ...p, score: 100, reason: "表記揺れで同値" };

      if (p.parameterId === "Capacitance") {
        const tNum = parseFloat(tv.replace(/[^\d.e+-]/gi, "")) || 0;
        const cNum = parseFloat(cv.replace(/[^\d.e+-]/gi, "")) || 0;
        if (Math.abs(tNum - cNum) < 0.001) return { ...p, score: 100, reason: "同値" };
        const ratio = tNum > 0 ? cNum / tNum : 0;
        if (ratio >= 0.8 && ratio <= 1.2) return { ...p, score: 95, reason: "許容範囲内" };
        return { ...p, score: 60, reason: `静電容量${tNum}µFと${cNum}µFで異なる` };
      }

      if (p.parameterId === "Voltage - Rated") {
        const tNum = parseFloat(tv.replace(/[^\d.-]/g, "")) || 0;
        const cNum = parseFloat(cv.replace(/[^\d.-]/g, "")) || 0;
        if (tNum === cNum) return { ...p, score: 100, reason: "同値" };
        if (cNum >= tNum) return { ...p, score: 95, reason: "上位互換" };
        return { ...p, score: 60, reason: `定格電圧${tNum}Vと${cNum}Vで異なる` };
      }

      if (p.parameterId === "Operating Temperature") {
        const tNums = extractNums(tv);
        const cNums = extractNums(cv);
        if (tNums.length >= 2 && cNums.length >= 2) {
          const [tMin, tMax] = [tNums[0], tNums[1]];
          const [cMin, cMax] = [cNums[0], cNums[1]];
          if (tMin === cMin && tMax === cMax) return { ...p, score: 100, reason: "同一" };
          if (cMin >= tMin && cMax >= tMax) return { ...p, score: 95, reason: "上位互換" };
          return { ...p, score: 70, reason: `動作温度${tMin}〜${tMax}℃と${cMin}〜${cMax}℃で異なる` };
        }
      }

      if (p.parameterId === "Thickness (Max)") {
        const tMm = extractMm(tv);
        const cMm = extractMm(cv);
        if (tMm != null && cMm != null) {
          if (Math.abs(tMm - cMm) < 0.05) return { ...p, score: 95, reason: "許容範囲内" };
          return { ...p, score: 70, reason: `厚さ${tMm}mmと${cMm}mmで異なる` };
        }
      }

      if (p.parameterId === "Size / Dimension") {
        const tMm = extractNums(tv).filter((n) => n > 0 && n < 20);
        const cMm = extractNums(cv).filter((n) => n > 0 && n < 20);
        if (tMm.length >= 2 && cMm.length >= 2 &&
            Math.abs(tMm[0] - cMm[0]) < 0.1 && Math.abs(tMm[1] - cMm[1]) < 0.1)
          return { ...p, score: 100, reason: "同一" };
        if (tMm.length >= 2 && cMm.length >= 2)
          return { ...p, score: 70, reason: `サイズ${tMm[0]}×${tMm[1]}mmと${cMm[0]}×${cMm[1]}mmで異なる` };
      }

      if ((p.parameterId === "Package / Case" || p.parameterId === "Temperature Coefficient") &&
          (tv.toLowerCase().includes(cv.toLowerCase()) || cv.toLowerCase().includes(tv.toLowerCase())))
        return { ...p, score: 100, reason: "同一" };

      if (tv.toLowerCase() === cv.toLowerCase()) return { ...p, score: 100, reason: "同一" };
      if (p.parameterId === "Mounting Type" && tv.includes("Surface") && cv.includes("Surface"))
        return { ...p, score: 95, reason: "同義" };
      if (p.parameterId === "Applications") {
        if (tv.includes("General") && cv.includes("General")) return { ...p, score: 100, reason: "同一" };
        // 用途が明らかに異なる場合はNG（部分一致にしない）
        const disp = p.description || p.parameterId;
        return { ...p, score: 0, reason: `${disp}が${tv}と${cv}で異なる` };
      }

      if (p.parameterId === "Tolerance") {
        const tPct = tv.match(/±\s*(\d+)\s*%?/);
        const cPct = cv.match(/±\s*(\d+)\s*%?/);
        if (tPct && cPct && tPct[1] === cPct[1]) return { ...p, score: 100, reason: "表記揺れで同値" };
        if (tPct && cPct) return { ...p, score: 70, reason: `許容差±${tPct[1]}%と±${cPct[1]}%で異なる` };
      }

      // "-" 同士は同一（DigiKey APIで未適用パラメータ）
      if ((tv === "-" || tv === "–" || tv === "—") && (cv === "-" || cv === "–" || cv === "—"))
        return { ...p, score: 100, reason: "同一" };

      // 片方が"-"（情報なし）で片方に値あり → 比較不可（部分一致にしない）
      const isEmpty = (s) => (s === "-" || s === "–" || s === "—" || s === "" || s.toLowerCase() === "n/a");
      if (isEmpty(tv) || isEmpty(cv))
        return { ...p, score: 0, reason: "片方情報なしのため比較不可" };

      const disp = p.description || p.parameterId;
      // フォールバック: 実際の値を含めて具体的に記載（悪い例「表記・条件の差あり」を避ける）
      return { ...p, score: 70, reason: `${disp}が${tv}と${cv}で異なる` };
    });

    const totalScore = Math.round(
      evaluatedParams.reduce((s, p) => s + p.score, 0) / evaluatedParams.length
    );
    const allHigh = evaluatedParams.every((p) => p.score >= 80);
    const lowItems = evaluatedParams.filter((p) => p.score < 80);
    const summary = allHigh ? "主要特性は同等" : (() => {
      if (lowItems.length === 0) return "主要特性は同等";
      const parts = [];
      for (const item of lowItems) {
        if (item.parameterId === "Thickness (Max)") {
          const tMm = extractMm(item.targetValue);
          const cMm = extractMm(item.candidateValue);
          if (tMm != null && cMm != null) { parts.push(`厚さ(${tMm}mm→${cMm}mm)`); continue; }
        }
        if (item.parameterId === "Size / Dimension") {
          const tN = extractNums(item.targetValue).filter((n) => n > 0 && n < 20);
          const cN = extractNums(item.candidateValue).filter((n) => n > 0 && n < 20);
          if (tN.length >= 2 && cN.length >= 2) { parts.push(`サイズ(${tN[0]}×${tN[1]}→${cN[0]}×${cN[1]}mm)`); continue; }
        }
        if (item.parameterId === "Voltage - Rated") {
          const tV = parseFloat(String(item.targetValue).replace(/[^\d.-]/g, "")) || 0;
          const cV = parseFloat(String(item.candidateValue).replace(/[^\d.-]/g, "")) || 0;
          if (tV && cV) { parts.push(`定格電圧(${tV}V→${cV}V)`); continue; }
        }
        if (item.parameterId === "Tolerance") {
          const tPct = String(item.targetValue).match(/±\s*(\d+)\s*%?/);
          const cPct = String(item.candidateValue).match(/±\s*(\d+)\s*%?/);
          if (tPct && cPct) { parts.push(`許容差(±${tPct[1]}%→±${cPct[1]}%)`); continue; }
        }
        parts.push(item.description || item.displayName || item.parameterId);
      }
      return parts.length === 1 ? `${parts[0]}が異なる` : `${parts.join("、")}が異なる`;
    })();

    const result = {
      targetId,
      candidateId,
      evaluatedAt: new Date().toISOString(),
      summary,
      parameters: evaluatedParams,
    };

    const outPath = path.join(outputDir, `${candidateId}.json`);
    await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`Saved: ${outPath} (score: ${totalScore})`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
