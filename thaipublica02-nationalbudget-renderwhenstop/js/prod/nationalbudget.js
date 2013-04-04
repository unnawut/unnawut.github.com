//
// ThaiPublica - National Budget Interactive Project
// Developed by Opendream (http://www.opendream.co.th)
//
// Note: To comprehend the script, start from async.parallel(...) at the bottom of this document.
//

$(function() {

    // Function to load svg map into the page.
    var load_map = function(callback) {
        var svg = $('#svgmap').svg({width: 1024, height: 661});

        // LOAD SVG
        svg.load('citymap.svg', 'get', function(mapdata) {

            // refresh_map() once so correct layers of each department are displayed
            refresh_map();

            // Create tooltips for all department key items
            attach_tooltips();

            // Callback to notify async that operation has completed
            callback(null);
        });

    };

    // Placeholder to hold rendered pie chart.
    var piechart;

    // Function to render pie chart.
    // If an existing pie chart already exists, it'll remove existing pie chart
    // and replace with the new pie chart with new values.
    var render_piechart = function(callback) {
        if(piechart != undefined) piechart.remove();

        // Reverse the departments array so the piechart draws clockwise
        departments_reversed = departments.slice(0).reverse();

        // Draw the pie chart
        piechart = Raphael("piechart", 430, 400).pieChart(215, 165, 150, _.pluck(departments_reversed, "budget"), departments_reversed, "#fff");

        // Callback to notify async that operation has completed
        callback(null);
    };

    // Controller template to be added to the page
    var controllerTemplate = _.template("\
        <div class=\"budget-controller\" id=\"<%= id %>\">\
            <h3><%= name %></h3>\
            <div class=\"amount-and-slider\">\
                <p class=\"amount\"><%= amount %></p>\
                <div class=\"budget-slider\"></div>\
            </div>\
            <div class=\"slider-unfocused\">\
                <p class=\"amount\"><%= amount %></p>\
            </div>\
        </div>");

    // Function to create controllers.
    // This includes creation of 1) controllers with sliders and 2) collapsed controllers.
    var render_controllers = function(callback) {

        // Run through each department to create each controller using data from data.js
        _.each(departments, function(dept){
            // Add a controller according to template defined above
            $("#budget-controllers").append(controllerTemplate({
                id: dept.english, 
                name: dept.thai, 
                amount: formatMoney(dept.budget) 
            }));
            
            // Add slider and sliding events to the expanded controller
            $("#budget-controllers").find("div.budget-controller:last div.budget-slider").slider({
                value: dept.budget,
                min: dept.minBudget,
                max: dept.maxBudget,
                slide: function( event, ui ) {
                    onControllerSlide(dept, ui.value);
                },
                stop: function( event, ui ) {
                    onControllerSlideStop(dept, ui.value);
                }
            });

            // Add onclick event to expanded controllers
            $("#budget-controllers").find("div.budget-controller:last div.amount-and-slider").click(function() {
                onExpandedControllerClicked(dept);
            });

            // Add collasped controllers to the page
            $("#budget-controllers").find("div.budget-controller:last div.slider-unfocused").progressbar({
                value: (dept.budget - dept.minBudget) / (dept.maxBudget - dept.minBudget),
                max: 1.0,
            }).click(function() {
                onCollapsedControllerClicked(dept);
            });

        });

        // Add scrollbar to controllers panel
        $(window).load(function(){

            $("#budget-controllers").mCustomScrollbar({
                scrollInertia: 0,
                mouseWheelPixels: 9,
            });
            
        });

        // Hide all sliders by default, show collapsed controllers only
        collapseAllControllers();

        // Callback to notify async that operation has completed
        callback(null);
    };

    // Operations to perform when user slides a controller slider
    var onControllerSlide = function(departmentSlided, newBudget) {

        // Perform budget adjustment
        var remainingBudget = adjustBudget(departmentSlided, newBudget);

        // Adjust other departments' budget to reflect total sum
        var otherDepartments = _.without(departments, departmentSlided);
        adjustOtherDepartments(otherDepartments, remainingBudget);

        // When adjustment is done, update controllers' value
        updateControllerValues();

        // Render pie chart and map
        render_piechart(function(){});

    }

    // Operations to perform when user stops sliding a controller slider
    var onControllerSlideStop = function(deptSlideStopped, newBudget) {
        refresh_map();
    }

    // Operations to perform when user click a collapsed controller
    var onCollapsedControllerClicked = function(departmentClicked) {

        // find and trigger the mouseover event so that the pie chart expands
        expandPie(departmentClicked);

        // If there was another deparment already expanded, shrink the pie too
        if(expandedDepartment) shrinkPie(expandedDepartment);

        // Show expanded controller for the clicked deparment
        showExpandedController(departmentClicked);

        // If the department is on map...
        if(departmentClicked.drawable) {

            // Highlight clicked department
            dimAllAndHighlight(departmentClicked);
        
        // If the department is not on map... 
        } else {

            // Change all items back to fully opaque
            setAllLayersOpaque();

        }

        // Trigger refresh_map() to make sure departments are shown at correct budget level
        refresh_map();

    }

    // Operations to perform when user click an expanded controller
    var onExpandedControllerClicked = function(departmentClicked) {

        // find and trigger the mouseover event so that the pie chart expands
        shrinkPie(departmentClicked);

        // Collapse the clicked controller and show only progress bar.
        collapseController(departmentClicked);

        // Layers of other departments were dimmed, set them back to fully opaque.
        setAllLayersOpaque();

        // Trigger refresh_map() to make sure departments are shown at correct budget level
        refresh_map();

    }

    // Function to refresh map display.
    // This function will check which budget range each department budget falls under, 
    // then show/hide layers according to the levels.
    var refresh_map = function() {

        // Hide/show correct layers by running through each department
        _.each(departments, function(dept) {

            if(!dept.selectorCache) dept.selectorCache = [];

            // If mapLevels is defined, evaluate the budget and show/hide layers according to mapLevels
            if(dept.mapLevels) {
                var rangeIndex = fallsInRange(dept.budget, dept.mapLevels);

                // var showSelector = '';
                // var hideSelector = '';

                for(i = 1; i <= dept.mapLevels.length; i++) {

                    // Cache DOM elements for each mapLevel
                    if(!dept.selectorCache[i]) {

                        dept.selectorCache[i] = $("#svgmap").find("svg > g[id^=" + dept.english + "-" + i + "]");
                        console.log("First time caching layers of department: " + dept.english + " mapLevel: " + i);

                    }

                    if(i <= (rangeIndex + 1)) {

                        // Show layers for the map level in range
                        dept.selectorCache[i].css('display', '');

                        // // Prepares DOM selector syntax for layers to be shown
                        // showSelector += "svg > g[id^=" + dept.english + "-" + i + "]";
                        // if(i != (rangeIndex + 1)) showSelector += ", ";

                    } else {

                        // Hide layers for the map level out of range
                        dept.selectorCache[i].css('display', 'none');

                        // // Prepares DOM selector syntax for layers to be hidden
                        // hideSelector += "svg > g[id^=" + dept.english + "-" + i + "]";
                        // if(i != dept.mapLevels.length) hideSelector += ", ";

                    }

                }

                // // Perform hide/show layers according to syntax prepared above
                // $("#svgmap").find(showSelector).css('display', '');
                // $("#svgmap").find(hideSelector).css('display', 'none');
            }

        });

    }

    // Function to attach tooltips to each department item.
    var attach_tooltips = function() {

        _.each(departments, function(dept) {

            // ":not([id^=enterprise-electric-])" is to exclude electric cables from having tooltips
            $("svg > g[id^=" + dept.english + "-] > g:not([id^=enterprise-electric-]), svg > g[id^=" + dept.english + "-] > use").tipsy({
                title: function() { return dept.thai; },
                gravity: 's',
            });

        });

    }

    // Function to adjust budget of a single department, 
    // then returns remaining budget to be adjusted by other departments
    var adjustBudget = function(dept, newBudget) {

        // Set department budget to new budget amount
        dept.budget = newBudget;

        // Calculate amount to adjust from other departments
        var remainingBudget = totalBudget - (_.reduce(departments, function(memo, dept){ 
            return memo + dept.budget
        }, 0));

        return remainingBudget;

    };

    // Function to try adjust all other departments for the remaining budget
    var adjustOtherDepartments = function(otherDepts, initialRemainingBudget) {
        var remainingAdjAmount = initialRemainingBudget;
        var averageAdj = 0;
        var numDepts = otherDepts.length;

        while(Math.round(remainingAdjAmount) != 0) {

            // Calculate average adjustment required from each department
            averageAdj = remainingAdjAmount / numDepts;

            // Try to adjust each department using average adjustment required
            _.each(otherDepts, function(dept) {

                // If negative adjustment...
                if( averageAdj < 0 ) {

                    // If deducting within minimum budget, adjust full amount
                    if( dept.budget + averageAdj >= dept.minBudget ) {

                        dept.budget += averageAdj;
                        remainingAdjAmount -= averageAdj;

                    // If deducting beyond minimum budget limit, adjust to minimum budget only
                    } else {

                        deductAmount = dept.budget - dept.minBudget
                        dept.budget = dept.minBudget;
                        remainingAdjAmount += deductAmount

                    }

                // If positive adjustment...
                } else {

                    // If adding within maximum budget, adjust full amount
                    if( dept.budget + averageAdj <= dept.maxBudget ) {

                        dept.budget += averageAdj;
                        remainingAdjAmount -= averageAdj;

                    // If adding beyond maximum budget limit, adjust to maximum budget only 
                    } else {

                        addingAmount = dept.maxBudget - dept.budget;
                        dept.budget = dept.maxBudget;
                        remainingAdjAmount -= addingAmount

                    }

                }

            });

        }
       
    }

    // Function to update controller values e.g. slider position, budget labels to reflect current data in "departments" variable.
    var updateControllerValues = function() {

        _.each(departments, function(dept) {

            // Update slider values
            $('#' + dept.english + " div.budget-slider").slider("option", "value", dept.budget);
            
            // Update budget amount labels
            $('#' + dept.english + " p.amount").text( formatMoney(dept.budget) );

            // Update progressbar for collapsed controllers
            $('#' + dept.english + " div.slider-unfocused").progressbar("option", "value", (dept.budget - dept.minBudget) / (dept.maxBudget - dept.minBudget));

        });

    }

    // Variable to keep track of expanded department.
    var expandedDepartment;

    // Function to show expanded version of controller for a given department.
    var showExpandedController = function(departmentToShow) {

        // If there's a department controller already expanded, collapse it.
        if(expandedDepartment && expandedDepartment.english != departmentToShow.english) {
            collapseController(expandedDepartment);
        }

        // Hide the collapsed version of the controller
        $('#' + departmentToShow.english + ' div.slider-unfocused').css('display', 'none');

        // Then show expanded controller for the given department
        $('#' + departmentToShow.english + ' div.amount-and-slider').css('display', '');

        expandedDepartment = departmentToShow;

    }

    // Function to show collapsed version of controller for a given department.
    var collapseController = function(departmentToCollapse) {

        // Hide the slider controller
        $('#' + departmentToCollapse.english + ' div.amount-and-slider').css('display', 'none');

        // Show the collapsed version of controller
        $('#' + departmentToCollapse.english + ' div.slider-unfocused').css('display', '');

        // Reset expanded department as the controller is no longer expanded
        if(expandedDepartment == departmentToCollapse) expandedDepartment = undefined;

    }

    // Function to collapse all controllers.
    var collapseAllControllers = function() {

        _.each(departments, function(dept) {
            collapseController(dept);
        });

    }

    // Function to highlight layers of given department.
    var dimAllAndHighlight = function(departmentToHightlight) {

        // Dim all decorations
        $("svg > g[id^=Layer ]", $("#svgmap")).fadeTo(0, 0.4);

        // Dim all department layers
        _.each(departments, function(dept) {
            $("svg > g[id^=" + dept.english + "-]", $("#svgmap")).fadeTo(0, 0.4);
        });

        // Then set fully opaque for selected department
        $("svg > g[id^=" + departmentToHightlight.english + "-]", $("#svgmap")).fadeTo(0, 1.0);

    }

    // Function to restore all layers to full opacity.
    var setAllLayersOpaque = function() {

        // Set all decorations to fully opaque
        $("svg > g[id^=Layer ]", $("#svgmap")).fadeTo(0, 1.0);

        // Set all department items to fully opaque
        _.each(departments, function(dept) {
            $("svg > g[id^=" + dept.english + "-]", $("#svgmap")).fadeTo(0, 1.0);
        });

    }

    Raphael.fn.pieChart = function (cx, cy, r, values, departments, stroke) {
        var paper = this;
        var rad = Math.PI / 180;
        var chart = this.set();

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

        // Draws a pie and returns the element object.
        var process = function (j) {

            var value = values[j],
                angleplus = 360 * value / total,
                popangle = angle + (angleplus / 2),
                ms = 500,
                delta = 0,
                percentage = value / total;

            paper.setStart();

            var p = sector(cx, cy, r, angle, angle + angleplus, {fill: departments[j].color, stroke: stroke, "stroke-width": 1});
            
            departments[j].pieCx = cx;
            departments[j].pieCy = cy;
            departments[j].pieMs = ms;

            // If the percentage > 5% then show percentage text
            if(value/total >= 0.07) {
                percentTxt = paper.text(cx + (r + 55 - 100) * Math.cos(-popangle * rad), cy + (r + 25 -80) * Math.sin(-popangle * rad), (value/total*100).toFixed(2) + "%").attr({fill: "#fff", "font-weight": "bold", stroke: "none", opacity: 1, "font-size": 18, cursor: 'pointer'});
            }

            var pieSet = paper.setFinish();

            pieSet.mouseover(function () {

                if(departments[j] == expandedDepartment) {

                    // If department is already expanded, the pie chart is already expanded too
                    // Nothing needs to be done

                } else {

                    // But if mouseover on collapsed department, expand the pie chart
                    // then shrink the pie chart of the expanded department
                    expandPie(departments[j]);
                    
                    // If there is an expanded department, shrink its pie
                    if(expandedDepartment) shrinkPie(expandedDepartment);

                }

            }).mouseout(function () {

                if(departments[j] == expandedDepartment) {

                    // If user performs mouseout of expanded department, we want to keep pie expanded
                    // Nothing needs to be done

                } else {

                    // But if mouseout of collapsed deparment, shrink it
                    // then re-expand the pie of expanded department
                    shrinkPie(departments[j]);

                    // If there is an expanded department, re-expand it
                    if(expandedDepartment) expandPie(expandedDepartment);

                }

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
                    height      : "380px",                  // note: svg height is 662px
                    top         : "141px",
                    transition  : "elastic",
                    speed       : 500,
                });
            });

            angle += angleplus;
            chart.push(p);
            start += .1;

            return p;
        };

        paper.circle(cx, cy, r).attr({stroke: stroke, "stroke-width": 10})

        for (i = 0; i < values.length; i++) {
            departments[i].pieElement = process(i);
        }

        return paper;
    };

    var expandPie = function(department) {
        department.pieElement.stop().attr({cursor: 'pointer'}).animate({transform: "s1.1 1.1 " + department.pieCx + " " + department.pieCy}, department.pieMs, "elastic");
    }

    var shrinkPie = function(department) {
        department.pieElement.stop().animate({transform: ""}, department.pieMs, "elastic");
    }

    var triggerRaphaelElementEvent = function(element, eventname) {
        _.find(element.events, function(event) { return (event.name == eventname) }).f();
    }

    // Actual start of script execution. To understand the script, start from here.
    // Async will parallelly execute the three operations below: load_map, render_piechart, render_controllers
    async.parallel([load_map, render_piechart, render_controllers], function (err, results) {

    });

});