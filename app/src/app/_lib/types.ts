export type AuthCodeLoginResult = {
    auth_jwt: string,
}

export type Client = {
    client_id: string,
    description: string,
    device_spec: string,
    network_id: string,
    connections: object[],
    provide_mode: number
}

export type NetworkClientsResult = {
    clients: Array<Client>,
}

type WalletInfo = {
    wallet_id: string,
    token_id: string,
    blockchain: string,
    blockchain_symbol: string,
    create_date: string,
    balance_usdc_nano_cents: 0,
    address: string,
}

type SubscriptionInfo = {
    subscription_id: string,
    store: string,
    plan: string,
}

export type SubscriptionBalanceResult = {
    balance_byte_count: number,
    current_subscription: SubscriptionInfo,
    active_transfer_balances: Array<object>,
    pending_payout_usd_nano_cents: number,
    wallet_info: WalletInfo,
    update_time: string,
}