var logged,
    auth = firebase.auth();


$(document).on("ready", function () {
    logged = false;
    handleLogin();
    $(".signout").on("click", function() {
        firebase.auth().signOut();
        reset();
    });
});


function reset() {
    $(".body").addClass("disabled");
    var bodyText = "<div class='signin'>\
    <div class='item'><label>Name</label><input name='name'/></div>\
    <div class='item'><label>Phone Number</label><input name='number'/></div>\
    <button class='submit'>Sign In</button></div>";
    $(".body").prepend(bodyText);
    $(".body .submit").on("click", signIn);
}
function handleLogin() {
    auth.onAuthStateChanged(function(user) {
          if (user) {
            // User is signed in.
            console.log('signed in');
            logged = true;
            svgDraw();
          } else if (!logged) {
            // No user is signed in.
            reset();
          }
    });
}
function signIn(e) {
    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
        .then(function() {
            // Existing and future Auth states are now persisted in the current
            // session only. Closing the window would clear any existing state even
            // if a user forgets to sign out.
            // ...
            // New sign-in will be persisted with session persistence.

            auth.signInWithEmailAndPassword("mattbriselli@gmail.com", "pwdpwd").catch(function(error) {
                // Handle Errors here.
                var errorCode = error.code,
                    errorMessage = error.message;
                    //TODO throw errors
            }).then(function() {
                console.log(auth.currentUser);
                logged = true;
                auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
                $(".body .signin").remove();
                svgDraw();
            });
        });
}
function svgDraw() {
    var code = "AAPL",
        url = "https://api.iextrading.com/1.0/stock/market/batch?symbols=" + code + "&types=quote,news,chart&range=1d";
    $.ajax({
        url: url,
        type: "GET"
    }).done(function(data) {
        grapher(data, "AAPL");
    }).fail(function(error) {
        console.log('ERROR' + error + 'FAILED TO LOAD STOCK DATA');
    });
}
function grapher(data, code) {
    var chart = $("svg"),
        svg = d3.select(chart[0]),
        margin = {top: 20, right: 30, bottom: 0, left: 50},
        width =+ 1100 - margin.left - margin.right,
        height =+ 550 - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
        parseTime = d3.timeParse("%H:%M"),
        x = d3.scaleTime().rangeRound([0, width]),
        y = d3.scaleLinear().rangeRound([height, 0]),
        lastY = 0;

    var line = d3.line()
        .x(function(d) {
            return x(parseTime(d.minute));
        })
        .y(function(d) {
            if (d.average > 0) {
                lastY = d.average;
                return y(d.average);
            } else if (d.marketAverage > 0) {
                lastY = d.marketAverage;
                return y(d.marketAverage);
            } else {
                return y(lastY);
            }
        });

    var ddata = data[code]["chart"];

    x.domain(d3.extent(ddata, function(d) { return parseTime(d.minute); }));
    y.domain(d3.extent(ddata, function(d) {
        if (d.average > 0) {
            lastY = d.average;
            return d.average;
        } else if (d.marketAverage > 0) {
            lastY = d.marketAverage;
            return d.marketAverage;
        } else {
            return lastY;
        }
    }));


    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call( d3.axisBottom(x).tickArguments([5]) )
        .classed("xAxis", true)
        .select(".domain")
            .remove();

    g.append("g").call(d3.axisLeft(y).tickArguments([8]))
        .classed("yAxis", true)
        .append("text")
            .attr("fill", "white")
            .attr("stroke", "white")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end");

    var xTicks = $(chart).find(".xAxis .tick");
    if (xTicks.length > 8) {
        for (var i = 0; i < xTicks.length; i++) {
            if (i % 2 == 0) {
                $(xTicks[i]).remove();
            }
        }
    }

    g.append("path")
        .datum(ddata)
        .attr("class", "curve")
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 3)
        .attr("d", line);

    chart.on("mouseover mousemove", function(e) {
        _hoverLine(e, g, chart, ddata);
    });
}
function _hoverLine(e, g, chart, ddata) {
    if (e["offsetX"] > 50 && e["offsetX"] < 1070 && !$(e["target"]).hasClass("line")) {
        chart.parent().find(".line, .lineText").remove();
        var svgRect = chart[0].getBoundingClientRect(),
            y = svgRect["height"] - svgRect["y"],
            xPos = e["offsetX"] - 50,
            xPort = xPos/1000;

        var dataLine = g.append("line")
            .attr("x1", xPos)
            .attr("x2", xPos)
            .attr("y1", 0)
            .attr("y2", 525)
            .attr("stroke-width", "2px")
            .attr("class", "line");
        

        var dataIndex = Math.floor(xPort * ddata.length);
        if (dataIndex < 0) {
            dataIndex = 0;
        } else if (dataIndex >= ddata.length) {
            dataIndex = ddata.length - 1;
        }

        var dVal = ddata[dataIndex]["average"];
        if (dVal == -1) {
            var off = 1;
            while (!dVal || dVal < 0) {
                var first = dataIndex + off,
                    sec = dataIndex - off,
                    firstV = -1,
                    secV = -1;

                off++;
                if (first < ddata.length) {
                    firstV = ddata[first]["average"];
                }
                if (sec > 0) {
                    secV = ddata[sec]["average"];
                }
                dVal = Math.max(firstV, secV);
            }

        }

        var dataText = g.append("text")
            .attr("x", xPos - 14)
            .attr("y", -10)
            .attr("class", "lineText")
            .text(_decFormat(dVal));


        // if (_prefs["dark"]) {
            // dataText.attr("fill", "white");
            // dataLine.attr("stroke", "white");
        // } else {
            dataText.attr("fill", "black");
            dataLine.attr("stroke", "black");
        // }
        
    }
}
function _decFormat(num) {
    var numRound = Math.round(num * 100) / 100;
    if (num < 1) {
        numRound = Math.round(num * 1000) / 1000;
    }
    
    return numRound;
}