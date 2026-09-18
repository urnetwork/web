export function getDisclaimerCopy(disclaimer = {}) {
    if (disclaimer.protocol && disclaimer.products) {
        return {
            protocol: disclaimer.protocol,
            products: disclaimer.products,
        };
    }

    return {
        protocol: disclaimer.before ?? '',
        products: 'ur.io',
    };
}
