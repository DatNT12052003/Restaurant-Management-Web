import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface MultiSelectOption {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: MultiSelectOption[];

    value: string[];

    onChange: (value: string[]) => void;

    placeholder?: string;

    emptyText?: string;

    className?: string;

    disabled?: boolean;
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
    emptyText = "No data found.",
    className,
    disabled,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selectedOptions = options.filter((option) => value.includes(option.value));

    const handleSelect = (selectedValue: string) => {
        if (value.includes(selectedValue)) {
            onChange(value.filter((item) => item !== selectedValue));
        } else {
            onChange([...value, selectedValue]);
        }
    };

    const handleRemove = (e: React.MouseEvent<HTMLElement>, removedValue: string) => {
        e.stopPropagation();

        onChange(value.filter((item) => item !== removedValue));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild disabled={disabled}>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("min-h-11 w-full justify-between px-3 py-2", className)}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        {selectedOptions.length > 0 ? (
                            selectedOptions.map((option) => (
                                <Badge key={option.value} variant="secondary" className="flex items-center gap-1">
                                    {option.label}

                                    {/* Không dùng <button>: nằm trong nút mở danh sách, button lồng button là HTML không hợp lệ */}
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`× ${option.label}`}
                                        onClick={(e) => handleRemove(e, option.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onChange(value.filter((item) => item !== option.value));
                                            }
                                        }}
                                        className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        <X className="h-3 w-3" />
                                    </span>
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </div>

                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                    <CommandInput placeholder="Search..." />

                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>

                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = value.includes(option.value);

                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => handleSelect(option.value)}
                                    >
                                        <Check
                                            className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                                        />

                                        {option.label}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
