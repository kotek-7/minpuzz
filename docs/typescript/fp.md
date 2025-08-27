# Functional Domain Modeling Guide

This guide provides patterns and practices for functional domain modeling in TypeScript.

## Overview

Functional domain modeling uses algebraic data types and pure functions to create robust, testable domain models. This approach emphasizes:

- **Type Safety**: Use the type system to make illegal states unrepresentable
- **Pure Functions**: Domain logic should be pure and synchronous
- **Branded Types**: Create type-safe wrappers for primitive values
- **Testability**: Pure functions are easy to test without mocks

## Project Structure

```
src/
├── model/          # Pure domain models and logic
│   ├── user.ts     # User domain model
│   ├── order.ts    # Order domain model
│   └── shared.ts   # Shared types and utilities
├── repository/     # Infrastructure and side effects
└── controller/     # Application layer
```

## Algebraic Data Types

### Sum Types (Tagged Unions)

```typescript
// model/order.ts
export type OrderStatus =
  | { type: "draft" }
  | { type: "submitted"; submittedAt: Date }
  | { type: "processing"; startedAt: Date }
  | { type: "completed"; completedAt: Date }
  | { type: "cancelled"; reason: string; cancelledAt: Date };

export type Order = {
  id: OrderId;
  customerId: CustomerId;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
};
```

### Product Types (Records)

```typescript
// model/user.ts
export type User = {
  id: UserId;
  email: Email;
  name: UserName;
  role: UserRole;
  createdAt: Date;
};

export type UserName = {
  first: string;
  last: string;
};
```

## Branded Types

Create type-safe wrappers for primitive values to prevent mixing different types of IDs or values:

```typescript
// model/shared.ts
declare const brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  [brand]: TBrand;
};

// ID types
export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type CustomerId = Brand<string, "CustomerId">;

// Value types
export type Email = Brand<string, "Email">;
export type Currency = Brand<number, "Currency">;

// Constructor functions
export const UserId = (id: string): UserId => id as UserId;
export const OrderId = (id: string): OrderId => id as OrderId;
export const Email = (email: string): Email => email as Email;
export const Currency = (amount: number): Currency => amount as Currency;

// Type guards
export const isUserId = (value: unknown): value is UserId =>
  typeof value === "string" && value.length > 0;

export const isEmail = (value: unknown): value is Email =>
  typeof value === "string" && value.includes("@");
```

## Domain Logic

Keep domain logic pure and synchronous:

```typescript
// model/order.ts
import { OrderId, CustomerId, Currency } from "./shared.ts";

export type OrderItem = {
  productId: string;
  quantity: number;
  price: Currency;
};

// Pure functions for domain logic
export function calculateTotal(items: OrderItem[]): Currency {
  const total = items.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );
  return Currency(total);
}

export function canCancelOrder(order: Order): boolean {
  return order.status.type === "draft" || order.status.type === "submitted";
}

export function cancelOrder(
  order: Order,
  reason: string,
  now: Date
): Order {
  if (!canCancelOrder(order)) {
    throw new Error(`Cannot cancel order in status: ${order.status.type}`);
  }
  
  return {
    ...order,
    status: {
      type: "cancelled",
      reason,
      cancelledAt: now
    }
  };
}

// State transitions
export function submitOrder(order: Order, now: Date): Order {
  if (order.status.type !== "draft") {
    throw new Error("Can only submit draft orders");
  }
  
  return {
    ...order,
    status: {
      type: "submitted",
      submittedAt: now
    }
  };
}
```

## Testing Domain Logic

Pure functions are easy to test:

```typescript
// model/order.test.ts
import { test, expect } from "vitest";
import { 
  calculateTotal, 
  canCancelOrder, 
  cancelOrder,
  OrderId,
  CustomerId,
  Currency
} from "./order.ts";

test("calculateTotal sums item prices correctly", () => {
  const items = [
    { productId: "p1", quantity: 2, price: Currency(10.00) },
    { productId: "p2", quantity: 1, price: Currency(5.50) }
  ];
  
  expect(calculateTotal(items)).toBe(Currency(25.50));
});

test("canCancelOrder returns true for draft orders", () => {
  const order = {
    id: OrderId("o1"),
    customerId: CustomerId("c1"),
    items: [],
    status: { type: "draft" as const },
    createdAt: new Date()
  };
  
  expect(canCancelOrder(order)).toBe(true);
});

test("cancelOrder throws for completed orders", () => {
  const order = {
    id: OrderId("o1"),
    customerId: CustomerId("c1"),
    items: [],
    status: { 
      type: "completed" as const,
      completedAt: new Date()
    },
    createdAt: new Date()
  };
  
  expect(() => cancelOrder(order, "test", new Date())).toThrow();
});
```

## AI Assistant Prompt Integration

Add to your CLAUDE.md or project prompts:

```markdown
## Domain Modeling Rules

When implementing domain logic:

1. **Use Algebraic Data Types**: Model domain with sum types (tagged unions) and product types
2. **Keep Core Pure**: All functions in `model/` must be pure
3. **Use Branded Types**: Wrap primitive types (string IDs, etc.) with branded types
4. **Test Domain Logic**: Write unit tests for all domain functions
```

## Best Practices

### Do:
- Model your domain with types first
- Make illegal states unrepresentable
- Keep domain logic pure and testable
- Use branded types for type safety
- Test domain logic thoroughly

### Don't:
- Use classes for pure data (prefer types/interfaces)
- Throw exceptions in domain logic (use Result types)

## Benefits

1. **Type Safety**: Branded types prevent mixing different IDs
2. **Testability**: Pure functions are trivial to test
3. **Maintainability**: Clear separation of concerns
4. **Refactoring**: Type system guides safe changes
5. **Documentation**: Types serve as living documentation