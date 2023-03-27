
function sparkPlot(containerId, measureType, unit) {
    const WIDTH      = 240;
    const HEIGHT     = 30;
    const DATA_COUNT = 90;
    const BAR_WIDTH  = (WIDTH - DATA_COUNT) / DATA_COUNT;
    const data = d3.range(DATA_COUNT).map( d => 0.3 + 0.7 * Math.random() );
    data.sort();
    data.reverse();
    const x    = d3.scaleLinear().domain([0, DATA_COUNT]).range([0, WIDTH]);
    const y    = d3.scaleLinear().domain([0, 1]).range([HEIGHT, 0]);
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
        .attr('title', function(d) {
            if (measureType == 'unit') {
                return '2023-02-25 10' + unit
            }
            else if (unit) {
                return '2023-02-25 2.3k ' + unit
            }
            else {
                return '2023-02-25 2.3k'
            }
        })


        // .on("mouseover", function(d){console.log(d); tooltip.style("visibility", "visible"); tooltip.style('left', d.x); tooltip.style('top', d.y); })
    // .on("mousemove", function(d){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
    // .on("mouseout", function(d){return tooltip.style("visibility", "hidden");});
}


function sparkPlotPlaceholder(containerId) {
    const WIDTH      = 240;
    const HEIGHT     = 30;
    const DATA_COUNT = 90;
    const BAR_WIDTH  = (WIDTH - DATA_COUNT) / DATA_COUNT;
    const data = d3.range(DATA_COUNT).map( d => 0.3 + 0.7 * Math.random() );
    data.sort();
    data.reverse();
    const x    = d3.scaleLinear().domain([0, DATA_COUNT]).range([0, WIDTH]);
    const y    = d3.scaleLinear().domain([0, 1]).range([HEIGHT, 0]);
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
        }
        else if (remainingMillis < 60 * 1000) {
            // show each second
            let seconds = Math.ceil(remainingMillis / 1000)
            updateNextTimeElement.textContent = 'in ' + seconds + ' seconds'
        }
        else {
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

        setTimeout(() => {
            let responseBody = MOCK_API_get_stats()
            self.handleUpdateStatsResponse(responseBody)
        }, 1000)
     }
     self.handleUpdateStatsResponse = (responseBody) => {
        let statsUpdateNextElement = self.element('stats-update-next')
        let statsLastUpdateElement = self.element('stats-last-update')
        let statsUpdateInProgressElement = self.element('stats-update-in-progress')

        statsUpdateNextElement.classList.remove('d-none')
        statsLastUpdateElement.classList.remove('d-none')
        statsUpdateInProgressElement.classList.add('d-none')

        let date = new Date()
        statsLastUpdateElement.textContent = 'Last update ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + '.'

        sparkPlot(self.id('stats-all-transfer'), 'unit', 'TiB')
        sparkPlot(self.id('stats-all-packets'), 'count', 'packets')
        sparkPlot(self.id('stats-providers'), 'count', 'providers')
        sparkPlot(self.id('stats-countries'), 'count', 'countries')
        sparkPlot(self.id('stats-cities'), 'count', 'cities')
        sparkPlot(self.id('stats-extender-transfer'), 'unit', 'TiB')
        sparkPlot(self.id('stats-extenders'), 'count', 'edges')
        sparkPlot(self.id('stats-networks'), 'count', 'networks')
        sparkPlot(self.id('stats-devices'), 'count', 'devices')

        sparkPlotTooltips()

        self.element('stats-all-transfer-summary').textContent = '10'
        self.element('stats-all-transfer-summary-rate').textContent = '10'
        self.element('stats-all-packets-summary').textContent = '10'
        self.element('stats-all-packets-summary-rate').textContent = '10'
        self.element('stats-providers-summary').textContent = '10'
        self.element('stats-providers-summary-verified').textContent = '10'
        self.element('stats-countries-summary').textContent = '10'
        self.element('stats-cities-summary').textContent = '10'
        self.element('stats-extender-transfer-summary').textContent = '10'
        self.element('stats-extender-transfer-summary-rate').textContent = '10'
        self.element('stats-extenders-summary').textContent = '10'
        self.element('stats-extenders-summary-verified').textContent = '10'
        self.element('stats-networks-summary').textContent = '10'
        self.element('stats-devices-summary').textContent = '10'

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
            <div class="stat"><table><tr><td colspan="2" class="title">Providers</td></tr><tr><td id="${id('stats-providers')}" class="plot"></td><td class="current"><span id="${id('stats-providers-summary')}">---</span><div class="substat"><div><span id="${id('stats-providers-summary-verified')}">---</span></div><div>verified</div></div></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Countries</td></tr><tr><td id="${id('stats-countries')}" class="plot"></td><td class="current"><span id="${id('stats-countries-summary')}">---</span></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Cities</td></tr><tr><td id="${id('stats-cities')}" class="plot"></td><td class="current"><span id="${id('stats-cities-summary')}">---</span></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Extender Transfer (TiB)</td></tr><tr><td id="${id('stats-extender-transfer')}" class="plot"></td><td class="current"><span id="${id('stats-extender-transfer-summary')}">---</span>TiB<div class="substat"><div><span id="${id('stats-extender-transfer-summary-rate')}">---</span>gbps</div><div>average</div></div></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Extenders</td></tr><tr><td id="${id('stats-extenders')}" class="plot"></td><td class="current"><span id="${id('stats-extenders-summary')}">---</span><div class="substat"><div><span id="${id('stats-extenders-summary-verified')}">---</span></div><div>verified</div></div></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Networks</td></tr><tr><td id="${id('stats-networks')}" class="plot"></td><td class="current"><span id="${id('stats-networks-summary')}">---</span></td></tr></table></div>
            <div class="stat"><table><tr><td colspan="2" class="title">Devices</td></tr><tr><td id="${id('stats-devices')}" class="plot"></td><td class="current"><span id="${id('stats-devices-summary')}">---</span></td></tr></table></div>
        </div>
    `

    container.innerHTML = html
}


function MOCK_API_get_stats() {
    // fixme return a map of date string to value
    // fixme return a summary value or a summary object
    return {
        transfer: {
            data: {
                '2023-02-20': 10
            },
            summary: 10,
            summaryRate: 10
        }
    }
}

