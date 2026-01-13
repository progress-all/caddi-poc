"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApiFormField {
  name: string;
  label: string;
  type?: "text" | "number";
  placeholder?: string;
  required?: boolean;
}

interface ApiFormProps {
  endpoint: string;
  fields: ApiFormField[];
  onSubmit: (data: Record<string, string | number>) => Promise<void>;
  isLoading?: boolean;
}

export function ApiForm({
  endpoint,
  fields,
  onSubmit,
  isLoading = false,
}: ApiFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(formData)) {
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
    <Card>
      <CardHeader>
        <CardTitle>{endpoint}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
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
              />
            </div>
          ))}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "実行中..." : "実行"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
