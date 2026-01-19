"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiFormField {
  name: string;
  label: string;
  type?: "text" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  options?: Array<{ value: string; label: string }>;
}

interface ApiFormProps {
  endpoint: string;
  fields: ApiFormField[];
  onSubmit: (data: Record<string, string | number>) => Promise<void>;
  isLoading?: boolean;
}

export const ApiForm = memo(function ApiForm({
  endpoint,
  fields,
  onSubmit,
  isLoading = false,
}: ApiFormProps) {
  // デフォルト値で初期化
  const initialFormData: Record<string, string | undefined> = {};
  fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      initialFormData[field.name] = String(field.defaultValue);
    }
  });

  const [formData, setFormData] = useState<Record<string, string | undefined>>(initialFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(formData)) {
      // undefinedの値はスキップ
      if (value === undefined) {
        continue;
      }
      const field = fields.find((f) => f.name === key);
      if (field?.type === "number") {
        data[key] = value ? Number(value) : 0;
      } else {
        data[key] = value;
      }
    }
    await onSubmit(data);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{endpoint}</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1 min-w-[120px] flex-1 max-w-[300px]">
            <Label htmlFor={field.name} className="text-xs text-muted-foreground">
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            {field.type === "select" ? (
              <Select
                value={formData[field.name]}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    [field.name]: value,
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id={field.name} className="h-9">
                  <SelectValue placeholder={field.placeholder || "選択してください"} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={field.name}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                value={formData[field.name] ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    [field.name]: e.target.value,
                  }))
                }
                required={field.required}
                disabled={isLoading}
                className="h-9"
              />
            )}
          </div>
        ))}
        <div className="flex items-end">
          <Button type="submit" disabled={isLoading} className="h-9">
            {isLoading ? "実行中..." : "実行"}
          </Button>
        </div>
      </form>
    </div>
  );
});
