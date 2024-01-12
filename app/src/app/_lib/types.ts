export type AuthCodeLoginResult = {
  by_jwt: string;
  error?: {
    message: string;
  };
};

export type Client = {
  client_id: string;
  description: string;
  device_spec: string;
  network_id: string;
  connections: object[];
  provide_mode: number;
};

export type NetworkClientsResult = {
  clients: Array<Client>;
};

type WalletInfo = {
  wallet_id: string;
  token_id: string;
  blockchain: string;
  blockchain_symbol: string;
  create_date: string;
  balance_usdc_nano_cents: 0;
  address: string;
};

type SubscriptionInfo = {
  subscription_id: string;
  store: string;
  plan: string;
};

export type SubscriptionBalanceResult = {
  balance_byte_count: number;
  current_subscription: SubscriptionInfo;
  active_transfer_balances: Array<object>;
  pending_payout_usd_nano_cents: number;
  wallet_info: WalletInfo;
  update_time: string;
};

// The key is technically a string representing a date, but can't type that.
export type Timeseries = { [key: string]: string | number };

export type Provider24h = {
  client_id: string;
  connected: boolean;
  connected_events_last_24h: {
    event_time: string;
    connected: boolean;
  }[];
  uptime_last_24h: number;
  transfer_data_last_24h: number;
  payout_last_24h: number;
  search_interest_last_24h: number;
  contracts_last_24h: number;
  clients_last_24h: number;
};

export type StatsProviders = {
  created_time: string;
  providers: Provider24h[];
};

export type StatsProvidersOverviewLast90Result = {
  [index: string]: any;
  lookback: number;
  created_time: string;
  uptime: Timeseries;
  transfer_data: Timeseries;
  payout: Timeseries;
  search_interest: Timeseries;
  contracts: Timeseries;
  clients: Timeseries;
};

export type StatsProviderLast90 = {
  [index: string]: any;
  lookback: number;
  created_time: string;
  uptime: Timeseries;
  transfer_data: Timeseries;
  payout: Timeseries;
  search_interest: Timeseries;
  contracts: Timeseries;
  clients: Timeseries;
  client_details: {
    client_id: string;
    transfer_data: Timeseries;
  }[];
};
