const educationData =
  "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json";
const countyData =
  // "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json";
  "https://cdn.jsdelivr.net/npm/us-atlas@3.0.0/counties-10m.json";

const width = 960;
const height = 640;
const margin = { top: 100, right: 0, bottom: 0, left: 0 };

const body = d3.select("body");

const svg = body
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

const tooltip = d3
  .select("body")
  .append("div")
  .attr("id", "tooltip")
  .style("opacity", 0);

const projection = d3
  .geoAlbersUsa()
  .scale(1300)
  .translate([width / 2, height / 3]);
const path = d3.geoPath().projection(projection);

const colorScale = d3.scaleQuantile(d3.schemePurples[8]);

Promise.all([d3.json(countyData), d3.json(educationData)]).then(
  ([topology, educData]) => {
    const bachelorRate = educData.map((d) => d.bachelorsOrHigher);
    colorScale.domain(d3.extent(bachelorRate));

    const educValueAccessor = (id) => {
      const row = educData.find((d) => d.fips === +id);
      return row ? row.bachelorsOrHigher : 0;
    };

    const counties = topojson.feature(
      topology,
      topology.objects.counties
    ).features;

    // Map Viz
    svg
      .selectAll(".county")
      .data(counties)
      .enter()
      .append("path")
      .attr(
        "class",
        (d) =>
          `county county-color-${colorScale(educValueAccessor(d.id)).substring(
            1
          )}`
      )
      .attr("data-fips", (d) => {
        const row = educData.find((obj) => obj.fips === +d.id);
        return row ? row.fips : 0;
      })
      .attr("data-education", (d) => educValueAccessor(d.id))
      .attr("d", path)
      .attr("fill", (d) => colorScale(educValueAccessor(d.id)))
      .on("mouseover", (e, d) => {
        const { state, area_name, bachelorsOrHigher } = educData.find(
          (obj) => obj.fips === +d.id
        );
        tooltip
          .attr("data-education", educValueAccessor(d.id))
          .style("top", e.pageY + "px")
          .style("left", e.pageX + "px")
          .style("opacity", 1)
          .html(`${area_name}, ${state}: `)
          .append("tspan")
          .text(`${bachelorsOrHigher}%`);
      })
      .on("mouseout", (e, d) => tooltip.style("opacity", 0));

    //Legend
    const legendWidth = 250;
    const legendHeight = 10;

    const xLegendScale = d3
      .scaleLinear()
      .domain(d3.extent(bachelorRate))
      .range([0, legendWidth]);

    const xLegendAxis = d3
      .axisBottom(xLegendScale)
      .tickValues([Math.round(d3.min(bachelorRate)), ...colorScale.quantiles()])
      .tickFormat((d) => Math.round(d) + "%")
      .tickSize([-10])
      .tickSizeOuter([0]);

    const legend = svg
      .append("g")
      .attr("id", "legend")
      .attr("class", "#legend")
      .attr("transform", `translate(${width - 330}, -40)`);

    legend
      .append("g")
      .selectAll("rect")
      .data(colorScale.range().slice(0, -1))
      .enter()
      .append("rect")
      .attr("x", (d) => xLegendScale(colorScale.invertExtent(d)[0]))
      .attr(
        "width",
        (d) =>
          xLegendScale(colorScale.invertExtent(d)[1]) -
          xLegendScale(colorScale.invertExtent(d)[0])
      )
      .attr("y", -legendHeight)
      .attr("height", legendHeight)
      .attr("fill", (d) => d)
      .on("mouseover", (e, d) => {
        console.log(d);
        svg
          .selectAll(`.county-color-${d.substring(1)}`)
          .attr("fill", "#bd09b7")
          .attr("stroke", "rgba(0, 0, 0, 0.8)");
      })
      .on("mouseout", (e, d) =>
        svg
          .selectAll(`.county-color-${d.substring(1)}`)
          .style("fill", d)
          .attr("stroke", "none")
      );

    legend
      .append("g")
      .call(xLegendAxis)
      .call((g) => g.select(".domain").remove());

    //States Boudaries
    const states = topojson.mesh(
      topology,
      topology.objects.states,
      (a, b) => a !== b
    );

    svg.append("path").datum(states).attr("class", "state").attr("d", path);

    //USA Boundaries
    const nation = topojson.mesh(
      topology,
      topology.objects.nation,
      (a, b) => a === b
    );
    svg.append("path").datum(nation).attr("class", "nation").attr("d", path);
  }
);
