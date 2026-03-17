import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import type { FinancialItem, AssetItem, InvestmentItem } from "@workspace/api-client-react";
import { Dialog, Input, Button, ToggleGroup } from "./ui/core";

type ItemType = "income" | "expenses" | "assets" | "investments";

interface ItemFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: ItemType;
  initialData?: any;
  onSave: (item: any) => void;
}

type ContributionFrequency = "monthly" | "yearly";

const normalizeContributionFrequency = (value: unknown): ContributionFrequency =>
  value === "yearly" ? "yearly" : "monthly";

const hasFrequency = (type: ItemType): boolean =>
  type === "income" || type === "expenses" || type === "investments";

const hasReturnRate = (type: ItemType): boolean =>
  type === "assets" || type === "investments";

export function ItemFormDialog({ isOpen, onClose, type, initialData, onSave }: ItemFormDialogProps) {
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [frequency, setFrequency] = React.useState<"monthly" | "yearly">("monthly");
  const [returnRate, setReturnRate] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setAmount(initialData?.amount?.toString() || "");
      setFrequency(normalizeContributionFrequency(initialData?.frequency));
      setReturnRate(initialData?.returnRate ? (initialData.returnRate * 100).toString() : "");
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    const baseItem = {
      id: initialData?.id || uuidv4(),
      name,
      amount: parseFloat(amount),
    };

    let finalItem: any = { ...baseItem };

    const safeFrequency = normalizeContributionFrequency(frequency);

    if (type === "income" || type === "expenses") {
      finalItem = { ...baseItem, frequency: safeFrequency } as FinancialItem;
    } else if (type === "assets") {
      finalItem = { ...baseItem, returnRate: parseFloat(returnRate) / 100 } as AssetItem;
    } else if (type === "investments") {
      finalItem = { ...baseItem, frequency: safeFrequency, returnRate: parseFloat(returnRate) / 100 } as InvestmentItem;
    }

    onSave(finalItem);
    onClose();
  };

  const titleMap = {
    income: "Income Source",
    expenses: "Expense",
    assets: "Existing Asset",
    investments: "Rolling Investment",
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`${initialData ? 'Edit' : 'Add'} ${titleMap[type]}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
          <Input 
            required 
            placeholder="e.g. Salary, Rent, S&P 500" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Amount (£)</label>
          <Input 
            required 
            type="number" 
            min="0" 
            step="0.01" 
            placeholder="0.00" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
          />
        </div>

        {hasFrequency(type) && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Frequency</label>
            <ToggleGroup 
              options={[{label: 'Monthly', value: 'monthly'}, {label: 'Annually', value: 'yearly'}]}
              value={frequency}
              onChange={(val) => setFrequency(normalizeContributionFrequency(val))}
            />
          </div>
        )}

        {hasReturnRate(type) && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Expected Annual Return (%)</label>
            <Input 
              required 
              type="number" 
              step="0.1" 
              placeholder="e.g. 7.5" 
              value={returnRate} 
              onChange={e => setReturnRate(e.target.value)} 
            />
          </div>
        )}

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">Save Item</Button>
        </div>
      </form>
    </Dialog>
  );
}
