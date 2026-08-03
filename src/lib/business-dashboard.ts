import { supabase } from "@/lib/supabase";

export type DashboardPeriod = 7 | 30 | 90;

export type BusinessDashboard = {
  generated_at: string;
  period_days: DashboardPeriod;
  targets: {
    food_cost_percent: number;
    prep_minutes: number;
    delivery_minutes: number;
  };
  kpis: {
    revenue_today: number;
    revenue_week: number;
    revenue_month: number;
    revenue: number;
    revenue_previous: number;
    orders: number;
    orders_previous: number;
    paid_orders: number;
    ticket: number;
    ticket_previous: number;
    identified_order_rate: number;
    repeat_customer_rate: number;
    average_rating: number | null;
    reviews_count: number;
    average_return_days: number | null;
    gross_margin: number | null;
  };
  movement: Array<{ date: string; orders: number; revenue: number }>;
  products: Array<{
    id: string;
    name: string;
    sale_price: number;
    units: number;
    revenue: number;
    gross_margin: number | null;
  }>;
  pricing: Array<{
    id: string;
    name: string;
    sale_price: number;
    recipe_cost: number;
    ingredient_count: number;
    food_cost_percent: number | null;
    suggested_price: number | null;
  }>;
  customers: Array<{
    id: string;
    name: string;
    orders: number;
    revenue: number;
    last_order_at: string;
    lifetime_orders: number;
  }>;
  channels: Array<{ channel: string; orders: number; revenue: number }>;
  payment_methods: Array<{ method: string; payments: number; revenue: number }>;
  operations: {
    active_orders: number;
    late_active_orders: number;
    cancellation_rate: number;
    average_prep_minutes: number | null;
    average_delivery_minutes: number | null;
    average_cycle_minutes: number | null;
    timed_prep_orders: number;
    timed_delivery_orders: number;
    status_mix: Array<{ status: string; orders: number }>;
  };
  inventory: {
    stock_value: number;
    low_stock_count: number;
    alerts: Array<{
      id: string;
      name: string;
      unit: string;
      stock_quantity: number;
      minimum_stock: number;
      coverage_days: number | null;
    }>;
  };
  data_quality: {
    recipe_coverage: number;
    cost_coverage: number;
    identified_order_coverage: number;
    timing_coverage: number;
  };
};

export async function getBusinessDashboard(organizationId: string, period: DashboardPeriod) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.rpc("get_business_dashboard", {
    p_organization_id: organizationId,
    p_period_days: period,
  });
  if (error) throw error;
  return data as unknown as BusinessDashboard;
}
