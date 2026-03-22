import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { BalanceSheetResponse, FinancialProfile, HealthStatus } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get the user's full financial data
 */
export declare const getGetBudgetUrl: () => string;
export declare const getBudget: (options?: RequestInit) => Promise<FinancialProfile>;
export declare const getGetBudgetQueryKey: () => readonly ["/api/budget"];
export declare const getGetBudgetQueryOptions: <TData = Awaited<ReturnType<typeof getBudget>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBudget>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBudget>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBudgetQueryResult = NonNullable<Awaited<ReturnType<typeof getBudget>>>;
export type GetBudgetQueryError = ErrorType<unknown>;
/**
 * @summary Get the user's full financial data
 */
export declare function useGetBudget<TData = Awaited<ReturnType<typeof getBudget>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBudget>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update the user's full financial data
 */
export declare const getUpdateBudgetUrl: () => string;
export declare const updateBudget: (financialProfile: FinancialProfile, options?: RequestInit) => Promise<FinancialProfile>;
export declare const getUpdateBudgetMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBudget>>, TError, {
        data: BodyType<FinancialProfile>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBudget>>, TError, {
    data: BodyType<FinancialProfile>;
}, TContext>;
export type UpdateBudgetMutationResult = NonNullable<Awaited<ReturnType<typeof updateBudget>>>;
export type UpdateBudgetMutationBody = BodyType<FinancialProfile>;
export type UpdateBudgetMutationError = ErrorType<unknown>;
/**
 * @summary Update the user's full financial data
 */
export declare const useUpdateBudget: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBudget>>, TError, {
        data: BodyType<FinancialProfile>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBudget>>, TError, {
    data: BodyType<FinancialProfile>;
}, TContext>;
/**
 * @summary Reset to default financial data
 */
export declare const getResetBudgetUrl: () => string;
export declare const resetBudget: (options?: RequestInit) => Promise<FinancialProfile>;
export declare const getResetBudgetMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetBudget>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof resetBudget>>, TError, void, TContext>;
export type ResetBudgetMutationResult = NonNullable<Awaited<ReturnType<typeof resetBudget>>>;
export type ResetBudgetMutationError = ErrorType<unknown>;
/**
 * @summary Reset to default financial data
 */
export declare const useResetBudget: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetBudget>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof resetBudget>>, TError, void, TContext>;
/**
 * @summary Balance sheet for saved profile (JSON)
 */
export declare const getGetBalanceSheetUrl: () => string;
export declare const getBalanceSheet: (options?: RequestInit) => Promise<BalanceSheetResponse>;
export declare const getGetBalanceSheetQueryKey: () => readonly ["/api/budget/balance-sheet"];
export declare const getGetBalanceSheetQueryOptions: <TData = Awaited<ReturnType<typeof getBalanceSheet>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBalanceSheet>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBalanceSheet>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBalanceSheetQueryResult = NonNullable<Awaited<ReturnType<typeof getBalanceSheet>>>;
export type GetBalanceSheetQueryError = ErrorType<unknown>;
/**
 * @summary Balance sheet for saved profile (JSON)
 */
export declare function useGetBalanceSheet<TData = Awaited<ReturnType<typeof getBalanceSheet>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBalanceSheet>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Balance sheet from a financial profile payload (JSON)
 */
export declare const getPostBalanceSheetUrl: () => string;
export declare const postBalanceSheet: (financialProfile: FinancialProfile, options?: RequestInit) => Promise<BalanceSheetResponse>;
export declare const getPostBalanceSheetMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postBalanceSheet>>, TError, {
        data: BodyType<FinancialProfile>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof postBalanceSheet>>, TError, {
    data: BodyType<FinancialProfile>;
}, TContext>;
export type PostBalanceSheetMutationResult = NonNullable<Awaited<ReturnType<typeof postBalanceSheet>>>;
export type PostBalanceSheetMutationBody = BodyType<FinancialProfile>;
export type PostBalanceSheetMutationError = ErrorType<unknown>;
/**
 * @summary Balance sheet from a financial profile payload (JSON)
 */
export declare const usePostBalanceSheet: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postBalanceSheet>>, TError, {
        data: BodyType<FinancialProfile>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof postBalanceSheet>>, TError, {
    data: BodyType<FinancialProfile>;
}, TContext>;
/**
 * @summary Export balance sheet as CSV from profile body
 */
export declare const getPostBalanceSheetExportCsvUrl: () => string;
export declare const postBalanceSheetExportCsv: (financialProfile: FinancialProfile, options?: RequestInit) => Promise<Blob>;
export declare const getPostBalanceSheetExportCsvMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postBalanceSheetExportCsv>>, TError, {
        data: BodyType<FinancialProfile>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof postBalanceSheetExportCsv>>, TError, {
    data: BodyType<FinancialProfile>;
}, TContext>;
export type PostBalanceSheetExportCsvMutationResult = NonNullable<Awaited<ReturnType<typeof postBalanceSheetExportCsv>>>;
export type PostBalanceSheetExportCsvMutationBody = BodyType<FinancialProfile>;
export type PostBalanceSheetExportCsvMutationError = ErrorType<unknown>;
/**
 * @summary Export balance sheet as CSV from profile body
 */
export declare const usePostBalanceSheetExportCsv: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof postBalanceSheetExportCsv>>, TError, {
        data: BodyType<FinancialProfile>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof postBalanceSheetExportCsv>>, TError, {
    data: BodyType<FinancialProfile>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map