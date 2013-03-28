$(function() {
    var load_map = function(callback) {
        var svg = $('#svgmap').svg({width: 1024, height: 661});
        // LOAD SVG
        svg.load('citymap.svg', 'get', function(mapdata) {
            callback(null);
        });

    };

    var piechart;

    var render_piechart = function(callback) {
        if(piechart != undefined) piechart.remove();

        // Reverse the departments array so the piechart draws clockwise
        departments_reversed = departments.slice(0).reverse();

        // Draw the pie chart
        piechart = Raphael("piechart", 430, 400).pieChart(215, 165, 150, _.pluck(departments_reversed, "budget"), departments_reversed, "#fff");

        callback(null);
    };

    var render_controllers = function(callback) {
        controllerTemplate = _.template("\
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

        _.each(departments, function(dept){
            // Add html container to hold a controller set
            $("#budget-controllers").append(controllerTemplate({id: dept.english, name: dept.thai, amount: formatMoney(dept.budget) }));
            
            // Add slider to controller div
            $("#budget-controllers").find("div.budget-controller:last div.budget-slider").slider({
                value: dept.budget,
                min: dept.minBudget,
                max: dept.maxBudget,
                slide: function( event, ui ) {
                    adjustBudget(dept, ui.value);
                }
            });

            // Add onclick event to budget controller (to hide controller)
            $("#budget-controllers").find("div.budget-controller:last div.amount-and-slider").click(function() {
                onBudgetReClick(dept);
            });

            $("#budget-controllers").find("div.budget-controller:last div.slider-unfocused").progressbar({
                value: (dept.budget - dept.minBudget) / (dept.maxBudget - dept.minBudget),
                max: 1.0,
            }).click(function() {
                onBudgetClick(dept);
            });

        });

        $(window).load(function(){
            $("#budget-controllers").mCustomScrollbar({
                scrollInertia: 0,
                mouseWheelPixels: 9,
            });
        });

        callback(null);
    };

    var render_map = function() {
        _.each(departments, function(dept) {
            // If mapLevels is defined, evaluate the budget and show/hide layers according to mapLevels
            if(dept.mapLevels) {
                var rangeIndex = fallsInRange(dept.budget, dept.mapLevels);
                var selectorSyntax = "";

                // console.log(dept.english + " has mapLevels and " + 
                //     dept.budget + " falls in index " + 
                //     rangeIndex + "(" + dept.mapLevels[rangeIndex] + ")");

                // Firstly, hide all layers of this department
                $("svg > g[id^=" + dept.english + "-]", $("#svgmap")).hide();

                // Then show layers as needed
                for(i = 0; i <= rangeIndex; i++) {
                    selectorSyntax += "svg > g[id^=" + dept.english + "-" + (i + 1) + "]";
                    if(i != rangeIndex) selectorSyntax += ", ";
                }

                $(selectorSyntax).show();
            }
        });

    }

    async.parallel([load_map, render_piechart, render_controllers], function (err, results) {
        render_map();
        onBudgetClick(departments[0]);

        _.each(departments, function(dept) {
            $("svg > g[id^=" + dept.english + "-] > g").tipsy({
                title: function() { return dept.thai; },
                gravity: 's',
            });
        });
    });

    var adjustBudget = function(dept, newBudget) {

        // Set department budget to new budget amount
        dept.budget = newBudget;

        // Calculate amount to adjust from other departments
        var remainingBudget = totalBudget - (_.reduce(departments, function(memo, dept){ 
            return memo + dept.budget 
        }, 0));

        // console.log("Remaining budget to adjust: " + remainingBudget);

        var otherDepartments = _.without(departments, dept);

        // Adjust other departments' budget to reflect total sum
        adjustOtherDepartments(otherDepartments, remainingBudget);

    };

    var adjustOtherDepartments = function(otherDepts, initialRemainingBudget) {
        var remainingAdjAmount = initialRemainingBudget;
        var averageAdj = 0;
        var numDepts = otherDepts.length;

        while(Math.round(remainingAdjAmount) != 0) {

            // Calculate average adjustment required from each department
            averageAdj = remainingAdjAmount / numDepts;

            _.each(otherDepts, function(dept) {

                // If negative adjustment...
                if( averageAdj < 0 ) {

                    if( dept.budget + averageAdj >= dept.minBudget ) {
                        // If deducting within minimum budget, adjust full amount
                        dept.budget += averageAdj;
                        remainingAdjAmount -= averageAdj;
                    } else {
                        // If deducting beyond minimum budget limit, adjust to minimum budget only
                        deductAmount = dept.budget - dept.minBudget
                        dept.budget = dept.minBudget;
                        remainingAdjAmount += deductAmount
                    }

                // If positive adjustment...
                } else {

                    if( dept.budget + averageAdj <= dept.maxBudget ) {
                        // If adding within maximum budget, adjust full amount
                        dept.budget += averageAdj;
                        remainingAdjAmount -= averageAdj;
                    } else {
                        // If adding beyond maximum budget limit, adjust to maximum budget only
                        addingAmount = dept.maxBudget - dept.budget;
                        dept.budget = dept.maxBudget;
                        remainingAdjAmount -= addingAmount
                    }
                }
            });

        }

        // When adjustment is done, update the UI
        _.each(departments, function(dept) {
            $('#' + dept.english + " div.budget-slider").slider("option", "value", dept.budget);
            $('#' + dept.english + " p.amount").text( formatMoney(dept.budget) );
            $('#' + dept.english + " div.slider-unfocused").progressbar("option", "value", (dept.budget - dept.minBudget) / (dept.maxBudget - dept.minBudget));
        })

        // Render pie chart
        render_piechart(function(){});

        render_map();
       
    }

    var currentSelectedDepartment;

    var onBudgetClick = function(departmentToShow) {
        _.each(departments, function(dept) {
            // console.log("Hiding " + dept.english);
            $('#' + dept.english + " div.amount-and-slider").hide();
        });

        $('#' + departmentToShow.english + ' div.amount-and-slider').show();
        $('#' + departmentToShow.english + ' div.slider-unfocused').hide();

        if(currentSelectedDepartment && currentSelectedDepartment.english != departmentToShow.english) {
            $('#' + currentSelectedDepartment.english + ' div.slider-unfocused').show();
        }

        currentSelectedDepartment = departmentToShow;

        // If the department is on map, change opacity for department selected....
        if(departmentToShow.drawable) {
            // Firstly, reduce opacity for all departments
            $("svg > g[id^=Layer ]", $("#svgmap")).fadeTo(0, 0.4);
            _.each(departments, function(dept) {
                $("svg > g[id^=" + dept.english + "-]", $("#svgmap")).fadeTo(0, 0.6);
            });

            // Then set fully opaque for selected department
            $("svg > g[id^=" + departmentToShow.english + "-]", $("#svgmap")).fadeTo(0, 1.0);
        
        // If the department is not on map, change all items back to fully opaque
        } else {

            // Set all deparment items to fully opaque
            _.each(departments, function(dept) {
                $("svg > g[id^=" + dept.english + "-]", $("#svgmap")).fadeTo(0, 1.0);
            });

            // Set all prop items to fully opaque
            $("svg > g[id^=Layer ]", $("#svgmap")).fadeTo(0, 1.0);

        }

        render_map();
    };

    var onBudgetReClick = function(departmentToHide) {
        // Hide the controller and show only budget
        $('#' + departmentToHide.english + ' div.amount-and-slider').hide();
        $('#' + departmentToHide.english + ' div.slider-unfocused').show();

        // Set all props back to fully opaque
        $("svg > g[id^=Layer ]", $("#svgmap")).fadeTo(0, 1.0);

        // Set all department items back to fully opaque
        _.each(departments, function(dept) {
            $("svg > g[id^=" + dept.english + "-]", $("#svgmap")).fadeTo(0, 1.0);
        });

        // When set items to fully opaque, the originally hidden layers also show,
        // run render_map() to make sure item levels are reflected on map
        render_map();
    }

});