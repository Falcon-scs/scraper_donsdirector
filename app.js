var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var stringify = require('csv-stringify');
var j = request.jar()

var detailPageLinks = []
var companyDetailUrls = require('./pagelinks.js');
var cookies;
start();

async function start() {
    // console.log("login start")
    // await login();
    // console.log("login end")
    // cookies = j.getCookieString('https://donsdirectory.com'); 
    // getDetailPage();
    getCompaydetail();
}

async function getCompaydetail() {
    let all_companydetails = []
    for (let i = 100; i < companyDetailUrls.length; i++) {
        console.log('....scraping....  ' + i)
        let url = companyDetailUrls[i].link;
        let companydetail = {
            index: i,
            url: url,
            referer: companyDetailUrls[i].referer,
            name: '',
            domain: '',
            activity: '',
            addresses: [],
        }
        let html_content = await loadPage(url, companyDetailUrls[i].referer);
        let $ = cheerio.load(html_content);
        //get tables
        let tables = [];
        $('table').each(function (i, elem) {
            if ($(this).attr('style') == 'padding-left:5px;') {
                tables.push($(this))
            }
        })
        if(tables.length == 0) {
            console.log("Error page");
            break;
        }
        //get company name,domain, activity
        let firstTable = tables[0];
        firstTable.find('td').each(function (i, elem) {
            if ($(this).attr('class') == 'report_medium' || $(this).attr('class') == 'report_medium_alt') {
                if ($(this).attr('align') == 'left') {
                    companydetail.name = $(this).text().trim()
                } else {
                    companydetail.domain = $(this).text().trim()
                }
            }
            if ($(this).attr('class') == 'report_comment') {
                companydetail.activity = $(this).text().replace('Business Activity: ', '').trim()
            }
        })

        //get address and employees
        for (let j = 1; j < tables.length; j++) {
            let table = tables[j]
            table.find('td').each(function (i, elem) {
                if ($(this).attr('style') == 'padding-left:10px; padding-right:10px; vertical-align:top;') { //if it is address
                    let newAddress = {
                        address: $(this).text().trim(),
                        phone: ($(this).parent().find('td').length == 2) ? $(this).parent().find('td').last().text().trim() : '',
                        employees: []
                    }
                    companydetail.addresses.push(newAddress)
                } else if ($(this).attr('style') == 'padding-left:20px; text-align:left; vertical-align:top;') {
                    let newEmployee = {
                        name: $(this).text().trim(),
                        phone: ($(this).parent().find('td').length == 2) ? $(this).parent().find('td').last().text().trim() : '',
                    }
                    companydetail.addresses[companydetail.addresses.length - 1].employees.push(newEmployee)
                }
            })
        }
        // console.log(JSON.stringify(companydetail, null, 4));
        console.log(companydetail)
        all_companydetails.push(companydetail)
        let data = JSON.stringify(all_companydetails);
        fs.writeFileSync('allcompanydata.json', data);
    }

    console.log("all done")

}

async function getDetailPage() {
    let pagelinks = ['https://donsdirectory.com/coindex.php'];
    for (let i = 65; i <= 90; i++) {
        pagelinks.push('https://donsdirectory.com/coindex.php?q=' + String.fromCharCode(i))
    }
    for (let i = 0; i < pagelinks.length; i++) {
        console.log('..........doing ' + pagelinks[i] + ' ..................')
        let referer = pagelinks[i]
        let html_content = await loadPage(pagelinks[i], 'https://donsdirectory.com/coindex.php');
        let $ = cheerio.load(html_content);
        $('.index_co').each(function (i, elem) {
            let link = $(this).find('a').first().attr('href')
            console.log(link)
            detailPageLinks.push({
                referer: referer,
                link: 'https://donsdirectory.com/' + link
            })
        })
    }

    let data = JSON.stringify(detailPageLinks);
    fs.writeFileSync('pagelinks.json', data);
    console.log("all done")
}

//login web site
function login() {
    return new Promise((resolve, reject) => {
        const options = {
            url: 'https://donsdirectory.com/login.php',
            method: 'POST',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.80 Safari/537.36',
                'referer': 'https://donsdirectory.com/login.php',
                'origin': 'https://donsdirectory.com',
                'Cookie': 'browserHeight=969; browserWidth=1097',
                'content-type': 'application/x-www-form-urlencoded'
            },
            jar: j,
            formData: {
                'UserID': 'BL67755',
                'UserPass': 'protonenergy',
                'bLogin': 1
            },
        }
        request(options, (err, response, body) => {
            resolve(body)
        });
    });
}

function loadPage(url, referer) {
    return new Promise((resolve) => {
        const options = {
            url: url,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.80 Safari/537.36',
                'referer': referer,
                'origin': 'https://donsdirectory.com',
                'host': 'donsdirectory.com',
                // 'Cookie': cookies + '; browserWidth=893; browserHeight=969'
                'Cookie': 'PHPSESSID=dn7satkcul8g2f4iq9c8nqgjg4; browserHeight=969; browserWidth=893'
            },
            jar: j
        }
        request(options, (err, response, body) => {
            resolve(body)
        });
    })
}
