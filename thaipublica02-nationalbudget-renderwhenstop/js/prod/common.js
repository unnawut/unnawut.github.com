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

    return 0;

}