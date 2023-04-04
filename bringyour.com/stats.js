// xxx.x
function humanRound(value) {
    return (Math.round(10 * value) / 10) + ''
}

function humanUnits(value) {
    if (1000 * 1000 < value) {
        return (Math.round(10 * value / (1000 * 1000)) / 10) + 'm'
    } else if (1000 < value) {
        return (Math.round(10 * value / (1000)) / 10) + 'k'
    } else {
        return value + ''
    }
}


function sparkPlot(containerId, data, measureType, unit) {
    let keys = Object.keys(data)
    keys.sort()
    let values = keys.map((key) => data[key])

    const WIDTH = 240;
    const HEIGHT = 30;
    const DATA_COUNT = keys.length
    const BAR_WIDTH = (WIDTH - DATA_COUNT) / DATA_COUNT;
    // const data = d3.range(DATA_COUNT).map( d => 0.3 + 0.7 * Math.random() );
    // data.sort();
    // data.reverse();
    const x = d3.scaleLinear().domain([0, DATA_COUNT]).range([0, WIDTH]);
    const y = d3.scaleLinear().domain([0, d3.max(values)]).range([0, HEIGHT]);

    d3.select('#' + containerId).selectAll('svg').remove()
    const svg = d3.select('#' + containerId).append('svg')
        .attr('width', WIDTH)
        .attr('height', HEIGHT)
        .append('g');
    // const tooltip = d3.select("body")
    // .append("div")
    // .style("position", "absolute")
    // .style("z-index", "10")
    // .style("visibility", "hidden")
    // .text("a simple tooltip");



    svg.selectAll('.bar').data(keys)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d, i) => x(i))
        .attr('y', d => HEIGHT - y(data[d]))
        .attr('width', BAR_WIDTH)
        .attr('height', d => y(data[d]))
        .attr('fill', 'rgb(220, 220, 220)')
        .attr('stroke', 'rgb(255, 255, 255)')
        .attr('title', function(d) {
            let value = data[d]
            if (measureType == 'unit') {
                return d + ' ' + humanRound(value) + '' + unit
            } else if (unit) {
                return d + ' ' + humanUnits(value) + ' ' + unit
            } else {
                return d + ' ' + humanUnits(value)
            }
        })


    // .on("mouseover", function(d){console.log(d); tooltip.style("visibility", "visible"); tooltip.style('left', d.x); tooltip.style('top', d.y); })
    // .on("mousemove", function(d){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
    // .on("mouseout", function(d){return tooltip.style("visibility", "hidden");});
}


function sparkPlotPlaceholder(containerId) {
    const WIDTH = 240;
    const HEIGHT = 30;
    const DATA_COUNT = 90;
    const BAR_WIDTH = (WIDTH - DATA_COUNT) / DATA_COUNT;
    const data = d3.range(DATA_COUNT).map(d => 0.3 + 0.7 * Math.random());
    data.sort();
    data.reverse();
    const x = d3.scaleLinear().domain([0, DATA_COUNT]).range([0, WIDTH]);
    const y = d3.scaleLinear().domain([0, 1]).range([HEIGHT, 0]);
    const svg = d3.select('#' + containerId).append('svg')
        .attr('width', WIDTH)
        .attr('height', HEIGHT)
        .append('g');
    // const tooltip = d3.select("body")
    // .append("div")
    // .style("position", "absolute")
    // .style("z-index", "10")
    // .style("visibility", "hidden")
    // .text("a simple tooltip");
    svg.selectAll('.bar').data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d, i) => x(i))
        .attr('y', d => HEIGHT - y(d))
        .attr('width', BAR_WIDTH)
        .attr('height', d => y(d))
        .attr('fill', 'rgb(220, 220, 220)')
        .attr('stroke', 'rgb(255, 255, 255)')


    // .on("mouseover", function(d){console.log(d); tooltip.style("visibility", "visible"); tooltip.style('left', d.x); tooltip.style('top', d.y); })
    // .on("mousemove", function(d){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
    // .on("mouseout", function(d){return tooltip.style("visibility", "hidden");});
}


function sparkPlotTooltips() {
    let tooltipTimeout = null

    $('svg .bar').mouseenter((event) => {
        let target = event.target
        let clientRect = target.getBoundingClientRect()

        target.classList.add('focused')

        let statsTooltipElement = document.getElementById('stats-tooltip')

        let title = target.getAttribute('title')
        if (title) {
            clearTimeout(tooltipTimeout)

            statsTooltipElement.classList.remove('d-none')
            statsTooltipElement.textContent = title
            statsTooltipElement.style.left = window.scrollX + clientRect.left
            statsTooltipElement.style.top = window.scrollY + clientRect.top + clientRect.height + 8
        }
    })

    $('svg .bar').mouseleave((event) => {
        let target = event.target

        target.classList.remove('focused')

        tooltipTimeout = setTimeout(() => {
            let statsTooltipElement = document.getElementById('stats-tooltip')
            statsTooltipElement.classList.add('d-none')
        }, 50)
    })
}


function createStatsMount(elementId) {
    return createMount(elementId, [])
}



function StatsPanel(firstLoad) {
    const self = this

    self.nextUpdateTime = 0
    self.countdownInterval = null

    self.render = (container) => {
        renderStats(container, self.id)

        sparkPlotPlaceholder(self.id('stats-all-transfer'))
        sparkPlotPlaceholder(self.id('stats-all-packets'))
        sparkPlotPlaceholder(self.id('stats-providers'))
        sparkPlotPlaceholder(self.id('stats-countries'))
        sparkPlotPlaceholder(self.id('stats-regions'))
        sparkPlotPlaceholder(self.id('stats-cities'))
        sparkPlotPlaceholder(self.id('stats-extender-transfer'))
        sparkPlotPlaceholder(self.id('stats-extenders'))
        sparkPlotPlaceholder(self.id('stats-networks'))
        sparkPlotPlaceholder(self.id('stats-devices'))

        self.updateStats()
    }
    self.router = (url) => {
        if (url.pathname == '/stats/update') {
            self.updateStats()
        }
    }


    // event handlers

    self.updateCountdown = () => {
        let updateNextTimeElement = self.element('stats-update-next-time')
        let remainingMillis = self.nextUpdateTime - Date.now()
        if (remainingMillis <= 0) {
            updateNextTimeElement.textContent = 'now'

            self.updateStats()
        } else if (remainingMillis < 60 * 1000) {
            // show each second
            let seconds = Math.ceil(remainingMillis / 1000)
            updateNextTimeElement.textContent = 'in ' + seconds + ' seconds'
        } else {
            // show x.x minutes
            let seconds = Math.ceil(remainingMillis / 1000)
            let minutes = Math.floor(seconds / 60)
            let remainingSecondsF = Math.floor(10 * (seconds - 60 * minutes) / 60)

            updateNextTimeElement.textContent = 'in ' + minutes + '.' + remainingSecondsF + ' minutes'
        }
    }

    self.updateStats = () => {
        if (self.countdownInterval) {
            clearInterval(self.countdownInterval)
        }

        let statsUpdateNextElement = self.element('stats-update-next')
        let statsLastUpdateElement = self.element('stats-last-update')
        let statsUpdateInProgressElement = self.element('stats-update-in-progress')

        statsUpdateNextElement.classList.add('d-none')
        statsUpdateInProgressElement.classList.remove('d-none')

        apiRequest('GET', '/stats/last-90')
            .catch((err) => {
                self.handleUpdateStatsResponse(null)
            })
            .then((responseBody) => {
                self.handleUpdateStatsResponse(responseBody)
            })

        // setTimeout(() => {
        //     let responseBody = MOCK_API_get_stats()
        //     self.handleUpdateStatsResponse(responseBody)
        // }, 1000)
    }
    self.handleUpdateStatsResponse = (responseBody) => {
        let statsUpdateNextElement = self.element('stats-update-next')
        let statsLastUpdateElement = self.element('stats-last-update')
        let statsUpdateInProgressElement = self.element('stats-update-in-progress')

        statsUpdateNextElement.classList.remove('d-none')
        statsLastUpdateElement.classList.remove('d-none')
        statsUpdateInProgressElement.classList.add('d-none')

        if (responseBody) {
            let date = new Date()
            statsLastUpdateElement.textContent = 'Last update ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + '.'

            sparkPlot(self.id('stats-all-transfer'), responseBody['allTransferData'], 'unit', 'TiB')
            sparkPlot(self.id('stats-all-packets'), responseBody['allPacketsData'], 'count', 'packets')
            sparkPlot(self.id('stats-providers'), responseBody['providersData'], 'count', 'providers')
            sparkPlot(self.id('stats-countries'), responseBody['countriesData'], 'count', 'countries')
            sparkPlot(self.id('stats-regions'), responseBody['regionsData'], 'count', 'regions')
            sparkPlot(self.id('stats-cities'), responseBody['citiesData'], 'count', 'cities')
            sparkPlot(self.id('stats-extender-transfer'), responseBody['extenderTransferData'], 'unit', 'TiB')
            sparkPlot(self.id('stats-extenders'), responseBody['extendersData'], 'count', 'edges')
            sparkPlot(self.id('stats-networks'), responseBody['networksData'], 'count', 'networks')
            sparkPlot(self.id('stats-devices'), responseBody['devicesData'], 'count', 'devices')

            sparkPlotTooltips()

            self.element('stats-all-transfer-summary').textContent = humanRound(responseBody['allTransferSummary'])
            self.element('stats-all-transfer-summary-rate').textContent = humanRound(responseBody['allTransferSummaryRate'])
            self.element('stats-all-packets-summary').textContent = humanUnits(responseBody['allPacketsSummary'])
            self.element('stats-all-packets-summary-rate').textContent = humanUnits(responseBody['allPacketsSummaryRate'])
            self.element('stats-providers-summary').textContent = humanUnits(responseBody['providersSummary'])
            self.element('stats-providers-summary-superspeed').textContent = humanUnits(responseBody['providersSummarySuperspeed'])
            self.element('stats-countries-summary').textContent = humanUnits(responseBody['countriesSummary'])
            self.element('stats-regions-summary').textContent = humanUnits(responseBody['regionsSummary'])
            self.element('stats-cities-summary').textContent = humanUnits(responseBody['citiesSummary'])
            self.element('stats-extender-transfer-summary').textContent = humanRound(responseBody['extenderTransferSummary'])
            self.element('stats-extender-transfer-summary-rate').textContent = humanRound(responseBody['extenderTransferSummaryRate'])
            self.element('stats-extenders-summary').textContent = humanUnits(responseBody['extendersSummary'])
            self.element('stats-extenders-summary-superspeed').textContent = humanUnits(responseBody['extendersSummarySuperspeed'])
            self.element('stats-networks-summary').textContent = humanUnits(responseBody['networksSummary'])
            self.element('stats-devices-summary').textContent = humanUnits(responseBody['devicesSummary'])
        }

        // 5 minutes
        let updateTimeoutMillis = 1000 * 60 * 5
        self.nextUpdateTime = Date.now() + updateTimeoutMillis
        self.countdownInterval = setInterval(self.updateCountdown, 1000)
        self.updateCountdown()
    }

}



function renderStats(container, id) {
    let script = 'script'
    let html = `
        <div>Daily trends from the last 90 days.
            <span id="${id('stats-last-update')}" class="d-none"></span>
            <span id="${id('stats-update-next')}" class="d-none"><a href="/stats/update">Next update <span id="${id('stats-update-next-time')}"></span></a></span>
            <span id="${id('stats-update-in-progress')}"><span id="${id('update-spinner')}" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Updating</span>
        </div>
        <div class="stats-container">
            <div class="stat"><table><tr><td colspan="2" class="title">Transfer (TiB)</td></tr><tr><td id="${id('stats-all-transfer')}" class="plot"></td><td class="current"><span id="${id('stats-all-transfer-summary')}">---</span>TiB<div class="substat"><div><span id="${id('stats-all-transfer-summary-rate')}">---</span>gbps</div><div>average</div></div></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Packets</td></tr><tr><td id="${id('stats-all-packets')}" class="plot"></td><td class="current"><span id="${id('stats-all-packets-summary')}">---</span><div class="substat"><div><span id="${id('stats-all-packets-summary-rate')}">---</span>pps</div><div>average</div></div></td></tr></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Providers</td></tr><tr><td id="${id('stats-providers')}" class="plot"></td><td class="current"><span id="${id('stats-providers-summary')}">---</span><div class="substat"><div><span id="${id('stats-providers-summary-superspeed')}">---</span></div><div><img src="res/images/superfast.svg" class="superfast">superfast</div></div></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Countries</td></tr><tr><td id="${id('stats-countries')}" class="plot"></td><td class="current"><span id="${id('stats-countries-summary')}">---</span></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Regions</td></tr><tr><td id="${id('stats-regions')}" class="plot"></td><td class="current"><span id="${id('stats-regions-summary')}">---</span></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Cities</td></tr><tr><td id="${id('stats-cities')}" class="plot"></td><td class="current"><span id="${id('stats-cities-summary')}">---</span></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Extender Transfer (TiB)</td></tr><tr><td id="${id('stats-extender-transfer')}" class="plot"></td><td class="current"><span id="${id('stats-extender-transfer-summary')}">---</span>TiB<div class="substat"><div><span id="${id('stats-extender-transfer-summary-rate')}">---</span>gbps</div><div>average</div></div></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Extenders</td></tr><tr><td id="${id('stats-extenders')}" class="plot"></td><td class="current"><span id="${id('stats-extenders-summary')}">---</span><div class="substat"><div><span id="${id('stats-extenders-summary-superspeed')}">---</span></div><div><img src="res/images/superfast.svg" class="superfast">superfast</div></div></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Networks</td></tr><tr><td id="${id('stats-networks')}" class="plot"></td><td class="current"><span id="${id('stats-networks-summary')}">---</span></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Devices</td></tr><tr><td id="${id('stats-devices')}" class="plot"></td><td class="current"><span id="${id('stats-devices-summary')}">---</span></td></tr></table></div>
        </div>
    `

    container.innerHTML = html
}