
function sparkPlot(containerId) {
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
	svg.selectAll('.bar').data(data)
	  .enter()
	  .append('rect')
	    .attr('class', 'bar')
	    .attr('x', (d, i) => x(i))
	    .attr('y', d => HEIGHT - y(d))
	    .attr('width', BAR_WIDTH)
	    .attr('height', d => y(d))
	    .attr('fill', 'rgb(220, 220, 220)');
}
