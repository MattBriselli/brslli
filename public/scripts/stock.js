var logged,
    signInText,
    logInText,
    queried,
    auth = firebase.auth(),
    storeObj;

$(document).on("ready", function () {
    logged = false;
    queried = {};
    handleLogin();
    $(".entry").on("keyup", function(e) {
        if (e.keyCode == 13) {
            //Enter Key
            var target = $(e.currentTarget),
                val = target.val().toUpperCase();
            if (val.indexOf(",") == -1 && val.indexOf(" ") == -1) {
                svgDraw(val);
            }
        }
    });
    $(".nameRow span").on("click", favorite);
    $(window).resize(function() {
        console.log("now");
    })
    $(".signout").on("click", function() {
        auth.signOut();
        window.location.href = "/";
        reset();
    });
});

function reset() {
    $(".body .svg").html("");
    $("input, button, a").attr("disabled", "disabled");
    $(".outer").hide();
    signInText = "<div class='signin'>\
        <div class='item'><label>Email</label><input type='email' id='name'/></div>\
        <div class='item'><label>Password</label><input type='password' id='password'/></div>\
        <div class='item'><button class='submit'>Sign In</button></div>\
        <div class='item'><button class='create'>Create a New Account</button></div></div>";
    $(".body").find(".signin").remove();
    $(".body").prepend(signInText);
    $(".signin .submit").on("click", signIn);
    $(".signin .create").on("click", create);
}
function handleLogin() {
    // firebase.firestore().settings({"timestampsInSnapshots: true"});
    auth.onAuthStateChanged(function(user) {
        if (user) {
            getDb(auth.currentUser);
        } else if (!logged) {
            reset();
        }
    });
}
function create() {
    $(".signin .item, .signin button").remove();
    logInText = "<div class='item'><label>Email</label><input type='email' id='name'/></div>\
        <div class='item'><label>Password</label>\
            <input minlength='6' required placeholder='6 characters min' type='password' id='password1'/></div>\
            <div class='item'><label>Enter Password Again</label><input type='password' id='password2'/></div>\
            <div class='item'><button class='createNew'>Create a New Account</button></div></div>\
            <div class='item'><button class='signIn'>Sign In</button></div>";
    $(".signin").append(logInText);
    $(".signin .signIn").on("click", reset);
    $(".signin .createNew").on("click", function() {
        if (createVerify($(".signin"))) {
            createUser($(".signin"), $(".signin #name").val(), $(".signin #password1").val());
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
function createUser(si, name, pwd) {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(function() {
        auth.createUserWithEmailAndPassword(name, pwd).catch(function(error) {
            si.find(".error").remove();
            var err = "<div class='error'>" + error.message + "</div>";
            si.append(err);
        }).then(function() {
            if (auth.currentUser != null) {
                logged = true;
                createDb(auth.currentUser);
                auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                $("input, button, a").removeAttr("disabled");
                $(".body .signin").remove();
                $(".outer").show();
                svgDraw("AAPL");
            }
        });
    });
}
function createDb(user) {
    storeObj = {"uid": user.uid};
    firebase.firestore().collection("users").doc(user.uid).set(storeObj);
    loadFavorites();
}
function getDb(user) {
    firebase.firestore().collection("users").doc(user.uid).get().then(function(doc) {
        storeObj = doc.data();
        logged = true;
        console.log(storeObj);
        if (storeObj["favorites"].length > 0) {
            var codes = storeObj["favorites"].join(",");
        } else {
            var codes = "AAPL";
        }
        svgDraw(codes);
    });
}
function signIn(e) {
    var target = $(e.currentTarget),
        si = target.parents(".signin"),
        name = si.find("#name"),
        pwd = si.find("#password");
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(function() {
        auth.signInWithEmailAndPassword(name.val(), pwd.val()).catch(function(error) {
            si.find(".error").remove();
            var err = "<div class='error'>" + error.message + "</div>";
            si.append(err);
        }).then(function() {
            if (auth.currentUser != null) {
                logged = true;
                getDb(auth.currentUser);
                auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                $("input, button, a").removeAttr("disabled");
                $(".body .signin").remove();
                $(".outer").show();
                svgDraw("AAPL");
            }
        });
    });
}
function codeProcess(code) {
    if (code.indexOf(",") != -1) {
        code = code.split(",");
        for (var i = 0; i < code.length; i++) {
            if (queried.hasOwnProperty(code[i])) {
                code.splice(i, 1);
            }
        }
    } else if (queried.hasOwnProperty(code)) {
        return "";
    }
    return code;
}
function svgDraw(code) {
    var codeRed = codeProcess(code);
    if (codeRed != "") {
        var url = "https://api.iextrading.com/1.0/stock/market/batch?symbols=" + codeRed + "&types=quote,news,chart&range=1d";
        $.ajax({
            url: url,
            type: "GET"
        }).done(function(data) {
            if (!$.isEmptyObject(data)) {
                codePost(code, data);
            } else {
                //TODO handle wrong case
                console.log('wrong');
            }
        });
    } else {
        codePost(code, queried);
    }
}
function codePost(code, data) {
    if (code.indexOf(",") != -1) {
        //mulitcodes
        var codeArr = code.split(","),
            c = codeArr[0];
        for (var s in codeArr) {
            queried[codeArr[s]] = data[codeArr[s]];
        }
    } else {
        queried[code] = data[code];
        var c = code;
    }
    grapher(data, c);
    dataInfo(data, c);
    loadFavorites();
}
function grapher(data, code) {
    var chart = $("svg");
    chart.html("");

    var parWid = chart.parent().width();
    chart.width(parWid);

    var svg = d3.select(chart[0]),
        margin = {top: 35, right: 30, bottom: 10, left: 50},
        width =+ parWid - margin.left - margin.right,
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

    chart.off("mouseover mousemove").on("mouseover mousemove", function(e) {
        hoverLine(e, g, chart, data[code]);
    });
}
function hoverLine(e, g, chart, ddata) {
    var parWid = chart.width(),
        parHeight = chart.height();
    if (e["offsetX"] > 50 && (e["offsetX"] < parWid-30) && !$(e["target"]).hasClass("line")) {
        chart.parent().find(".line, .lineText, .circ").remove();
        var xPos = e["offsetX"] - 50,
            xPort = xPos/(parWid-80),
            dchart = ddata["chart"],
            dataIndex = Math.floor(xPort * dchart.length);

        if (dataIndex < 0) {
            dataIndex = 0;
        } else if (dataIndex >= dchart.length) {
            dataIndex = dchart.length - 1;
        }

        var dVal = dchart[dataIndex]["average"];
        if (dVal <= -1) {
            var off = 1;
            while (!dVal || dVal < 0) {
                var first = dataIndex + off,
                    sec = dataIndex - off,
                    firstV = -1,
                    secV = -1;
                off++;
                if (first < dchart.length) {
                    firstV = dchart[first]["average"];
                }
                if (sec > 0) {
                    secV = dchart[sec]["average"];
                }
                dVal = Math.max(firstV, secV);
            }
        }

        var openP = ddata["quote"]["open"],
            curr = decFormat(dVal),
            diff = (curr - openP),
            color = "black";
            
        if (openP && curr) {
            if (diff < 0) {
                color = "red";
            } else if (diff > 0) {
                //same price will use default colors
                color = "green";
            }
        }

        g.append("line")
            .attr("x1", xPos)
            .attr("x2", xPos)
            .attr("y1", 0)
            .attr("y2", 355)
            .attr("stroke", color)
            .attr("stroke-width", "2px")
            .attr("class", "line");

        g.append("text")
            .attr("x", xPos - 35)
            .attr("y", -10)
            .attr("class", "lineText")
            .attr("fill", color)
            .attr("z-index", 5)
            .text(curr + " (" + decFormat(diff)+ ")");

        var textWid = chart.find(".lineText")[0].getBoundingClientRect()["width"];
        if (xPos - 35 + textWid >= parWid - 55) {
            //xPos - 35 is the textBox's left
            //parWid - 50 is the chart width minus the right margin
            chart.find(".lineText").attr("x", parWid - 55 - textWid);
        }
    }
}
function loadFavorites() {
    if (storeObj.hasOwnProperty("favorites") && storeObj["favorites"].length > 0) {
        for (var index in storeObj["favorites"]) {
            var code = storeObj["favorites"][index];
            if ($(".right .stock."+code).length == 0) {
                addFavorite(code);
            }
        }
        $(".row .col-2 .right .stock:not(.title)").off("click").on("click", clickFavorite);
    }
}
function favorite(e) {
    var target = $(e.currentTarget),
        selected = target.prev().text();
    if (!storeObj.hasOwnProperty("favorites")) {
        storeObj["favorites"] = [];
    }
    if (storeObj["favorites"].indexOf(selected) == -1) {
        storeObj["favorites"].push(selected);
        addFavorite(selected);
        $(".row .col-2 .right .stock:not(.fav)").off("click").on("click", clickFavorite);
    } else {
        var ind = storeObj["favorites"].indexOf(selected);
        storeObj["favorites"].splice(ind, 1);
    }
    target.toggleClass("glyphicon-star glyphicon-star-empty");
    firebase.firestore().collection("users").doc(storeObj["uid"]).set(storeObj);
}
function addFavorite(stock) {
    var stockRow = "<div class='stock "+stock+"' data-value='"+stock+"'><div class='name'>" + stock + "</div>";
    stockRow += "<div class='price'>" + queried[stock]["quote"]["close"] + "</div></div>";
    if ($(".row .col-2 .right .stock." + stock).length == 0) {
        $(".row .col-2 .right").append(stockRow);
    }
}
function clickFavorite(e) {
    codePost($(e.currentTarget).data("value"), queried);
}
function dataInfo(data, code) {
    var len = data[code]["chart"].length,
        last = data[code]["chart"][len-1],
        first = data[code]["chart"][0],
        change;

    if (data[code]["quote"]["calculationPrice"] == "tops") {
        change = data[code]["quote"]["change"];
    } else {
        if (!first["open"] || first["open"] < 0) {
            var ind = 0;
            while (ind < len && (!data[code]["chart"][ind]["open"] || data[code]["chart"][ind]["open"] < 0)) {
                ind++;
            }
            first = data[code]["chart"][ind];
        }

        if (!last["close"] || last["close"] < 0) {
            while (len > 0 && (!last["close"] || last["close"] < 0)) {
                len -= 1;
                last = data[code]["chart"][len];
            }
        }

        change = (last["close"] - first["open"]);
    }

    var prefix = (change > 0) ? "+" : "";

    if (prefix !== "+") {
        $(".svg").find(".curve").attr("stroke", "red");
    }

    if (storeObj["favorites"].indexOf(code) != -1) {
        $(".nameRow .glyphicon").addClass("glyphicon-star").removeClass("glyphicon-star-empty");
    } else {
        $(".nameRow .glyphicon").addClass("glyphicon-star-empty").removeClass("glyphicon-star");
    }

    $(".stockName").text(code);
    $(".nameRow span").show();
}
function decFormat(num) {
    var numRound = Math.round(num * 100) / 100;
    if (num < 0.1) {
        numRound = Math.round(num * 1000) / 1000;
    }
    return numRound;
}