import { describe, it, expect } from "vitest";
import { getRiskLevel } from "./compliance-utils";
import type { NormalizedCompliance } from "./types";

describe("getRiskLevel", () => {
  describe("既存のリスク判定（substitutionCount未指定）", () => {
    it("High: RoHSがNonCompliant", () => {
      const compliance: NormalizedCompliance = {
        rohs: "NonCompliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance)).toBe("High");
    });

    it("High: REACHがNonCompliant", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "NonCompliant",
      };
      expect(getRiskLevel(compliance)).toBe("High");
    });

    it("High: ステータスがObsolete", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Obsolete")).toBe("High");
    });

    it("High: ステータスがDiscontinued", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Discontinued")).toBe("High");
    });

    it("Medium: RoHSがUnknown", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Unknown",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance)).toBe("Medium");
    });

    it("Medium: REACHがUnknown", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Unknown",
      };
      expect(getRiskLevel(compliance)).toBe("Medium");
    });

    it("Medium: ステータスがLast Time Buy", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Last Time Buy")).toBe("Medium");
    });

    it("Medium: ステータスがNot For New Designs", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Not For New Designs")).toBe("Medium");
    });

    it("Low: RoHS/REACHが両方CompliantかつActive", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Active")).toBe("Low");
    });

    it("Low: RoHS/REACHが両方Compliantかつステータス未指定", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance)).toBe("Low");
    });

    it("Medium: デフォルト（想定外のケース）", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Preliminary")).toBe("Medium");
    });
  });

  describe("代替候補件数が0の場合（リスクを1段階引き上げ）", () => {
    it("Low → Medium: 候補0件", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Active", 0)).toBe("Medium");
    });

    it("Medium → High: 候補0件", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Unknown",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, undefined, 0)).toBe("High");
    });

    it("High → High: 候補0件でも据え置き", () => {
      const compliance: NormalizedCompliance = {
        rohs: "NonCompliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, undefined, 0)).toBe("High");
    });

    it("High → High: Obsoleteで候補0件でも据え置き", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Obsolete", 0)).toBe("High");
    });
  });

  describe("代替候補件数が1以上の場合（既存判定を変更しない）", () => {
    it("Low → Low: 候補1件", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Active", 1)).toBe("Low");
    });

    it("Low → Low: 候補複数件", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Active", 5)).toBe("Low");
    });

    it("Medium → Medium: 候補1件", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Unknown",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, undefined, 1)).toBe("Medium");
    });

    it("High → High: 候補1件でも下がらない", () => {
      const compliance: NormalizedCompliance = {
        rohs: "NonCompliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, undefined, 1)).toBe("High");
    });

    it("High → High: 候補複数件でも下がらない", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Obsolete", 10)).toBe("High");
    });
  });

  describe("代替候補件数が未取得の場合（既存判定を据え置き）", () => {
    it("Low → Low: nullの場合", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Active", null)).toBe("Low");
    });

    it("Low → Low: undefinedの場合", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Compliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, "Active", undefined)).toBe("Low");
    });

    it("Medium → Medium: nullの場合", () => {
      const compliance: NormalizedCompliance = {
        rohs: "Unknown",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, undefined, null)).toBe("Medium");
    });

    it("High → High: nullの場合", () => {
      const compliance: NormalizedCompliance = {
        rohs: "NonCompliant",
        reach: "Compliant",
      };
      expect(getRiskLevel(compliance, undefined, null)).toBe("High");
    });
  });
});
