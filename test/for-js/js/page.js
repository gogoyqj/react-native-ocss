var rss = require('../../../lib/parser.js')

var styles = rss.parserString(`
    .test {
        border: $testBorder solid $testBorderColor;
    }
    .xx {
        border-left: $testBorder solid $testBorderColor;
        font-color: blue;
    }
`, {
    testBorder: 1,
    testBorderColor: "#fff",
})

console.log(styles)

var styles = rss.parserFile("../css/index.css", {
    testBorder: 1,
    testBorderColor: "#fff",
}) 
console.log(styles)

