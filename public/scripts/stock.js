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
    $(".body .svg").html("<svg class='svg'></svg>");
    $(".body").addClass("disabled");
    var bodyText = "<div class='signin'>\
    <div class='item'><label>Email</label><input type='email' id='name'/></div>\
    <div class='item'><label>Password</label><input type='password' id='password'/></div>\
    <div class='item'><button class='submit'>Sign In</button></div>\
    <div class='item'><button class='create'>Create a New Account</button></div></div>";
    $(".body").prepend(bodyText);
    $(".signin .submit").on("click", signIn);
    $(".signin .create").on("click", create);
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
function create() {
    $(".signin .item, .signin button").remove();
    $(".signin").append("<div class='item'><label>Email</label><input type='email' id='name'/></div>");
    $(".signin").append("<div class='item'><label>Password</label>\
        <input minlength='6' required placeholder='6 characters min' type='password' id='password1'/></div>");
    $(".signin").append("<div class='item'><label>Enter Password Again</label><input type='password' id='password2'/></div>");
    $(".signin").append("<button class='createNew'>Create a New Account</button>");
    $(".signin .createNew").on("click", function() {
        if (createVerify($(".signin"))) {
            createUser($(".signin #name").val(), $(".signin #password1").val());
        } else if ($(".signin .error").length == 0) {
            $(".signin").append("<div class='error'>Invalid Information</div>");
        }
    })
}
function createVerify(modal) {
    var name = modal.find("#name"),
        pwd1 = modal.find("#password1"),
        pwd2 = modal.find("#password2");

    if (name.val() === "" || pwd1.val().length < 6 || pwd1.val() !== pwd2.val()) {
        return false;
    }
    if (name.val().indexOf("@") == -1 || name.val().indexOf(".") == -1) {
        return false;
    }
    return true;
}
function createUser(name, pwd) {
    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).then(function() {
        auth.createUserWithEmailAndPassword(name, pwd).catch(function(error) {
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
function signIn(e) {
    var target = $(e.currentTarget);
    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).then(function() {
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
        width =+ 900 - margin.left - margin.right,
        height =+ 400 - margin.top - margin.bottom,
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
    if (e["offsetX"] > 50 && e["offsetX"] < 870 && !$(e["target"]).hasClass("line")) {
        chart.parent().find(".line, .lineText").remove();
        var xPos = e["offsetX"] - 50,
            xPort = xPos/1000;

        var dataLine = g.append("line")
            .attr("x1", xPos)
            .attr("x2", xPos)
            .attr("y1", 0)
            .attr("y2", 380)
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