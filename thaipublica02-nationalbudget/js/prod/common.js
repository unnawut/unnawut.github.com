var formatMoney = function(number) {
    x = Math.round(number).toString().split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';

    var rgx = /(\d+)(\d{3})/;

    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }

    return x1 + x2 + " บาท";
}

var fallsInRange = function(number, range) {

    var l = range.length;

    while(l--) {
        if( range[l] <= number ) {
            return l;
        }
    }

}

Raphael.fn.pieChart = function (cx, cy, r, values, departments, stroke) {
    var paper = this,
        rad = Math.PI / 180,
        chart = this.set();

    function sector(cx, cy, r, startAngle, endAngle, params) {
        var x1 = cx + r * Math.cos(-startAngle * rad),
            x2 = cx + r * Math.cos(-endAngle * rad),
            y1 = cy + r * Math.sin(-startAngle * rad),
            y2 = cy + r * Math.sin(-endAngle * rad);
        return paper.path(["M", cx, cy, "L", x1, y1, "A", r, r, 0, +(endAngle - startAngle > 180), 0, x2, y2, "z"]).attr(params);
    }

    var angle = 90,
        total = totalBudget,
        start = 0;

    var process = function (j) {

        var value = values[j],
            angleplus = 360 * value / total,
            popangle = angle + (angleplus / 2),
            ms = 500,
            delta = 0,
            percentage = value / total;

        if(Math.round(value) != Math.round(total)) {
            paper.setStart();

            var p = sector(cx, cy, r, angle, angle + angleplus, {fill: departments[j].color, stroke: stroke, "stroke-width": 1});
            
            // If the percentage > 5% then show percentage text
            if(value/total >= 0.07) {
                percentTxt = paper.text(cx + (r + 55 - 100) * Math.cos(-popangle * rad), cy + (r + 25 -80) * Math.sin(-popangle * rad), (value/total*100).toFixed(2) + "%").attr({fill: "#fff", "font-weight": "bold", stroke: "none", opacity: 1, "font-size": 18, cursor: 'pointer'});
            }

            var pieSet = paper.setFinish();

            pieSet.mouseover(function () {
                p.stop().attr({cursor: 'pointer'}).animate({transform: "s1.1 1.1 " + cx + " " + cy}, ms, "elastic");
            }).mouseout(function () {
                p.stop().animate({transform: ""}, ms, "elastic");
            }).mouseup(function() {
                 var colorboxtext = '<div class="ministryinfo">\
                    <h2>' + departments[j].thai + '</h2> \
                    <p>' + departments[j].topText + '</p>\
                ';

                if(departments[j].keyItemImage) {
                    colorboxtext += '<img src="' + departments[j].keyItemImage + '" />'
                }

                _.each(departments[j].keyValuesText, function(pair) {
                    colorboxtext += '<h3 class="pairheading">' + pair.key + '</h3><p class="pairtext">' + pair.value + '</p>';
                });

                _.each(departments[j].legends, function(text) {
                    colorboxtext += '<p class="legend">' + text + '</p>';
                });
                
                colorboxtext += '</div>';

                $.colorbox({
                    html        : colorboxtext,
                    width       : "520px",
                    opacity     : 0.5,
                    height      : "380px",
                    transition  : "elastic",
                    speed       : 500,
                });
            });
        } else {
            var p = sector(cx, cy, r, 0, 359, {fill: departments[j].color, stroke: stroke, "stroke-width": 1});

            p.mouseover(function () {
                p.stop().attr({cursor: 'pointer'}).animate({transform: "s1.1 1.1 " + cx + " " + cy}, ms, "elastic");
            }).mouseout(function () {
                p.stop().animate({transform: ""}, ms, "elastic");
            }).mouseup(function() {
                 var colorboxtext = '<div class="ministryinfo">\
                    <h2>' + departments[j].thai + '</h2> \
                    <p>' + departments[j].topText + '</p>\
                ';

                if(departments[j].keyItemImage) {
                    colorboxtext += '<img src="' + departments[j].keyItemImage + '" />'
                }

                _.each(departments[j].keyValuesText, function(pair) {
                    colorboxtext += '<h3 class="pairheading">' + pair.key + '</h3><p class="pairtext">' + pair.value + '</p>';
                });

                _.each(departments[j].legends, function(text) {
                    colorboxtext += '<p class="legend">' + text + '</p>';
                });
                
                colorboxtext += '</div>';

                $.colorbox({
                    html        : colorboxtext,
                    width       : "520px",
                    opacity     : 0.5,
                    height      : "380px",
                    transition  : "elastic",
                    speed       : 500,
                });
            });
        }
        angle += angleplus;
        chart.push(p);
        start += .1;
    };

    paper.circle(cx, cy, r).attr({stroke: stroke, "stroke-width": 10})

    for (i = 0; i < values.length; i++) {
        process(i);
    }

    return paper;
};