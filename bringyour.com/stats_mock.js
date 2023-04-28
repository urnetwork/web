

function MOCK_API_get_stats() {
    // fixme return a map of date string to value
    // fixme return a summary value or a summary object

    // sparkPlot(self.id('stats-all-transfer'), 'unit', 'TiB')
    // sparkPlot(self.id('stats-all-packets'), 'count', 'packets')
    // sparkPlot(self.id('stats-providers'), 'count', 'providers')
    // sparkPlot(self.id('stats-countries'), 'count', 'countries')
    // sparkPlot(self.id('stats-cities'), 'count', 'cities')
    // sparkPlot(self.id('stats-extender-transfer'), 'unit', 'TiB')
    // sparkPlot(self.id('stats-extenders'), 'count', 'edges')
    // sparkPlot(self.id('stats-networks'), 'count', 'networks')
    // sparkPlot(self.id('stats-devices'), 'count', 'devices')

    function data90Days() {
        let data = {}
        for (var i = 0; i < 90; i += 1) {
            data['2023-02-' + ('' + i).padStart(2, '0')] = 50000 * (i + 1)
        }
        return data
    }

    return {
        allTransferData: data90Days(),
        allTransferSummary: 10,
        allTransferSummaryRate: 10,

        allPacketsData: data90Days(),
        allPacketsSummary: 10,
        allPacketsSummaryRate: 10,

        providersData: data90Days(),
        providersSummary: 10,
        providersSummarySuperspeed: 10,

        countriesData: data90Days(),
        countriesSummary: 10,

        regionsData: data90Days(),
        regionsSummary: 10,

        citiesData: data90Days(),
        citiesSummary: 10,

        extenderTransferData: data90Days(),
        extenderTransferSummary: 10,
        extenderTransferSummaryRate: 10,

        extendersData: data90Days(),
        extendersSummary: 10,
        extendersSummarySuperspeed: 10,

        networksData: data90Days(),
        networksSummary: 10,

        devicesData: data90Days(),
        devicesSummary: 10
    }
}
