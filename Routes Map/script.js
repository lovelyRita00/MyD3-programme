$("#map").css("height", $("#map").outerWidth() + "px");

var sens = .1

var margin = {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
    },
    width = $("#map").outerWidth() - margin.left - margin.right,
    height = $("#map").outerHeight() - margin.top - margin.bottom;

//This is the project for the globe 
var projection = d3.geo.orthographic()
    .scale(height / 2)
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .precision(0.5);

var color = d3.scale.category10();

//Path function. All paths are drawn through the projection.
var path = d3.geo.path()
    .projection(projection)
    .pointRadius(8);

var graticule = d3.geo.graticule();

//Zoom is defined.
var zoom = d3.behavior.zoom()
    .scaleExtent([1, 3])
    .on("zoom", zoomed);

var zoomEnhanced = d3.geo.zoom().projection(projection)
    .on("zoom", zoomedEnhanced);

// Create a voronoi layer for better mouse interaction experience
// For more reading on voronoi, check out 
// http://www.visualcinnamon.com/2015/07/voronoi.html

var voronoi = d3.geom.voronoi()
    .x(function(d) {
        return d.x;
    })
    .y(function(d) {
        return d.y;
    })
    .clipExtent([
        [0, 0],
        [width, height]
    ]);


var svg = d3.select('#map').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('class', 'graph-svg-component')
    .call(responsivefy) // Call function responsivefy to make the graphic reponsive according to the window width/height
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .call(zoomEnhanced);


// Globe Outline (Background circle)
// -------------
var globe = svg.selectAll('path.globe').data([{
        type: 'Sphere'
    }])
    .enter().append('path')
    .attr('class', 'globe')
    .attr('d', path);


queue()
    .defer(d3.json, "./data/world-110m.json")
    .defer(d3.csv, "./data/ports.csv")
    .defer(d3.csv, "./data/routes.csv")
    .await(ready);

function ready(error, world, ports, routes) {
    if (error) throw error;

    var countries = topojson.feature(world, world.objects.countries).features;
    
    svg.selectAll('baseMap')
      .data(countries)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('class', 'baseMap');


    var portById = d3.map(ports, function(d) { return d.port; });
    var routesById = d3.map(routes, function(d) { return d['ID']; });

    // input    
    var input = d3.select("input");
    console.log(input);

    document.onkeydown=function mykeyDown(e){  
    //compatible IE and firefox because there is not event in firefox  
    e = e || event;
    if(e.keyCode == 13) {  //When pressed 'Enter'
    
    d3.selectAll("g").remove();

    var lineCode = input.property("value");
    var hightlightLine = routesById.get(lineCode);

    if(typeof(hightlightLine) == 'undefined') {
          alert("The Route ID is not exist!");
          d3.selectAll("g").remove();
          reset();
          $("#tooltip-container").hide();
    } else {

    var route = hightlightLine['Route'].split(",");
    
    var html = "";
    html += "<div class=\"tooltip_kv\">";
    html += "<span class=\"tooltip_key\">";
    html += "Port Route: ";
    html += route;
    html += "</span>";
    html += "<br>";
    $("#tooltip-container").html(html);
    $("#tooltip-container").show();

    var edges = getRoutationLL(route);
    

    edges.forEach(
        function(d) {
            
            d.start_lat = +portById.get(d[0])['lat']
            d.start_long = +portById.get(d[0])['lng']
            d.end_lat = +portById.get(d[1])['lat'];
            d.end_long = +portById.get(d[1])['lng']; 
            
            d.greatcircle = new arc.GreatCircle({
                    x: d.start_long,
                    y: d.start_lat
                }, {
                    x: d.end_long,
                    y: d.end_lat
                });
                d.line = d.greatcircle.Arc(100, {
                    offset: 10
                });
                d.arc = d.line.json();
         }
    );

    var data = edges;
    
    recentered(data[0]);

    svg.append("text")
        .attr("class","country")
        .attr("x", width * 0.03)
        .attr("y", height * 0.03)
        .text("");

    var point = svg.append("g")
        .attr("class", "cities_end")
        .selectAll(".cities_end")
        .data(route)
        .enter()
        .append("path")
        .datum(function(d) {
            return {
                type: "Point",
                coordinates: [+portById.get(d)['lng'], +portById.get(d)['lat']],
                Country: portById.get(d)['Country'],
                Port: portById.get(d)['port']
            };
        })
        .style("fill", function(d) { 
            if(d.Country == 'NULL') {return "#000"} 
                else { return color(d.Country); }; })
        .attr("class", "cities_end")
        .attr("d", path)
        .on('mouseover',function(d){
          d3.select(".country")
            .text(d.Port + ": "+ d.Country)
        })
        .on('mouseout',function(d){
          d3.select(".country")
            .text("")
        })

    var lines = svg.append("g")
        .attr("class", "line")
        .selectAll(".arc")
        .data(data.map(function(d) {
            return d.arc;
        }))
        .enter()
        .append("path")
        .attr("class", "arc")
        .attr("d", path);        
        

        }
    }
  }

}

d3.select("svg").call(d3.behavior.drag()
            .origin(function() {
        var r = projection.rotate();
        return {
            x: r[0],
            y: -r[1]
        }; //starting point
    })
            .on("dragstart",function() {d3.event.sourceEvent.stopPropagation()})
            .on("drag",function(a) {
                var r=n.invert(d3.mouse(this));
                r&&!isNaN(r[0])&&(a.coordinates[0]=r[0],a.coordinates[1]=r[1],t(500))
        svg.selectAll(".baseMap").attr("d", path);
        svg.selectAll(".arc").attr("d", path);
        svg.selectAll('.cities_end').attr("d", path);

        $(".reset-btn").removeClass("disabled");
   }));     



d3.select("svg").call( //drag on the svg element
    d3.behavior.drag()
                .origin(function() {
        var r = projection.rotate();
        return {
            x: r[0],
            y: -r[1]
        }; //starting point
    })
            .on("drag",function(a) {
                var r=n.invert(d3.mouse(this));
                r&&!isNaN(r[0])&&(a.coordinates[0]=r[0],a.coordinates[1]=r[1],t(500))
        
        /* redraw the map and circles after rotation */
        svg.selectAll(".baseMap").attr("d", path);
        svg.selectAll(".arc").attr("d", path);
        svg.selectAll(".cities_end").attr("d", path);
        
        $(".reset-btn").removeClass("disabled"); 
}))


$(".reset-btn").on("click", function() {
    reset();
})



function n(t,a){var r=t[0],n=t[1],e=t[2],i=t[3],o=a[0],s=a[1],c=a[2],u=a[3];
    return[r*o-n*s-e*c-i*u,r*s+n*o+e*u-i*c,r*c-n*u+e*o+i*s,r*u+n*c-e*s+i*o]}function e(t,a){if(t&&a)
{var r=u(t,a),n=Math.sqrt(c(r,r)),e=.5*Math.acos(Math.max(-1,Math.min(1,c(t,a)))),i=Math.sin(e)/n;
    return n&&[Math.cos(e),r[2]*i,-r[1]*i,r[0]*i]} }


function reset() {

    svg.selectAll("g").remove();
    $("#tooltip-container").hide();
    //This is the project for the globe 
    projection.scale(height / 2)
        .translate([width / 2, height / 2]);

    //Set intitial view centerpoint.
    projection.rotate([0, 0, 0]);

    svg.selectAll(".baseMap").transition().duration(100).attr("d", path);
    svg.selectAll(".arc").transition().duration(100).attr("d", path);
    svg.selectAll('.cities_end').transition().duration(100).attr("d", path);
    svg.selectAll('.globe').transition().duration(100).attr("d", path);

    $(".reset-btn").addClass("disabled");

}


function getRoutationLL(route) {
    var start_ports = [];
    var end_ports = [];
    var edges = [];
for (var i=0; i<route.length-1; i++) {
    start_ports.push(route[i]); }
for (var j=1; j<route.length; j++) {
    end_ports.push(route[j]);
}
for(var ix=0; ix<start_ports.length; ix++) {
    edges.push([start_ports[ix], end_ports[ix]])
}
return edges;
}

// apply transformations to map and all elements on it 
function zoomed(d) {

    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    //grids.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    //geofeatures.select("path.graticule").style("stroke-width", 0.5 / d3.event.scale);
    svg.selectAll("path.boundary").style("stroke-width", 0.5 / d3.event.scale);
}

function zoomedEnhanced() {

	$(".reset-btn").removeClass("disabled");

    svg.selectAll(".baseMap").attr("d", path);
    svg.selectAll(".arc").attr("d", path);
    svg.selectAll('.cities_end').attr("d", path);
    svg.selectAll('.globe').attr("d", path);
}


function responsivefy(svg) {
    var container = d3.select(svg.node().parentNode),
        width = parseInt(svg.style('width')),
        height = parseInt(svg.style('height')),
        aspect = width / height;

    svg.attr('viewBox', '0 0 ' + width + ' ' + height)
        .attr('perserveAspectRatio', 'xMinYMid')
        .call(resize);

    d3.select(window).on('resize', resize);
    $("#map").css("height", $("#map").width() + "px");

    function resize() {

        $("#map").css("height", $("#map").width() + "px");

        var targetWidth = parseInt(container.style('width'));
        svg.attr('width', targetWidth);
        svg.attr('height', Math.round(targetWidth / aspect));
    }
}


function recentered(d) {
    //This is the project for the globe 
    var r = projection.rotate();

    projection.scale(height / 2)
        .translate([width / 2, height / 2]);

    nodes = [+d.start_lat, +d.start_long];

    projection.rotate([+d.start_lat, -d.start_long, r[2]]);

    // projection.rotate([+d.start_lat * 2 + 20, +d.start_long / 2 -20, 0]);

    svg.selectAll(".baseMap").transition().duration(100).attr("d", path);
    svg.selectAll(".arc").transition().duration(100).attr("d", path);
    svg.selectAll('.cities_end').transition().duration(100).attr("d", path);
    svg.selectAll('.globe').transition().duration(100).attr("d", path);

}