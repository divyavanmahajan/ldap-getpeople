// Author: Divya van Mahajan
// Git repository: https://github.com/divyavanmahajan/ldap-getpeople

var ldap = require('ldapjs');
var queue = require('queue');
var read = require('read');
var stringify = require('csv-stringify');
var fs = require('fs');
var opt;

getOptions();

function getOptions() {

    getopt = require('node-getopt').create([
        ['l', 'ldap=LDAP_URL', 'URL to connect to LDAP server. Examples ldap://130.140.80.134:389 or ldaps://130.140.80.134:689'],
        ['u', 'user=USER_DN', 'User DN (distinguished name) to logon to the Active Directory/LDAP server.'],
        ['p', 'password=PASSWORD', 'PASSWORD for the user to logon to the Active Directory/LDAP server. If not used, the program prompts you for a password'],
        ['m', 'manager=USER_DN', 'The User DN (distinguished name) of the topmost manager.'],
        ['o', 'output=FILENAME', 'Save results as tab delimited to FILENAME.tsv. The default is results.tsv.'],
        ['j', 'json=FILENAME', 'Save results as JSON to FILENAME. The default is results.json'],
        ['h', 'help', 'display this help']
    ]);              // create Getopt instance
    getopt.setHelp(
        "Usage: ldap-getpeople [OPTION]\n" +
        "Download the people reporting to the starting manager using the Active Directory attribute directReports. Recursively go down the tree to the node-getopt help demo.\n" +
        "\n" +
        "[[OPTIONS]]\n" +
        "\n" +
        "Installation: npm install ldap-getpeople\n" +
        "Respository:  https://github.com/divyavanmahajan/ldap-getpeople"
    );

    opt = getopt.parseSystem().options; // parse command line
    if (!opt['output']) {
        opt['output'] = 'results.tsv';
    }
    if (!opt['json']) {
        opt['json'] = 'results.json';
    }
    if (opt["help"]) {
        getopt.showHelp();
        process.exit(-1);
    }
    console.info('Options', opt);
    
    if (!opt['user'] || !opt['manager'] || !opt['ldap']) {
        getopt.showHelp();
        process.exit(-1);
    }
    else {
        if (opt['password']) {
            main();
        } else {
            read({ prompt: 'Password:', silent: true }, function (err, result) {
                if (err) {
                    console.error(err);
                    process.exit(-1);
                }
                opt['password'] = result;
                main();
            });
        }
    }

}

function main() {
    
    var counter = 0;
    console.time('Download time');
    
    console.error('Starting to scan the LDAP server.')
    var csvFileStream = fs.createWriteStream(opt['output'], {
        encoding: 'utf8',
        flags: 'w'
    });
    var jsonFileStream = fs.createWriteStream(opt['json'], {
        encoding: 'utf8',
        flags: 'w'
    });

    stringifier = stringify({ delimiter: '\t' });

    stringifier.pipe(csvFileStream);


    var q = queue({ concurrency: 100 });
    q.timeout = 5000;
    q.on('timeout', function (next, job) {
        console.error('job timed out:', job.toString().replace(/\n/g, ''));
        next();
    });
    var client = ldap.createClient({
        url: 'ldap://130.140.80.134:389'
    });
    client.bind(opt.user, opt.password, function (err) {
        if (err) {
            console.error('Cannot logon to the LDAP server:', err);
            process.exit(-1);
        }
        console.error('Logged into the LDAP server.')
        jsonFileStream.write('[');
        q.push(getUserFN(opt.manager));
        q.start(function (err) {
            console.info(counter+ ' users downloaded.');
            stringifier.end();
    	    jsonFileStream.end();
	    console.timeEnd('Download time');
            process.exit(0);
        });
    });

    var person = {}; // Map DN to userPrincipalName
    // Recursively get all users in manager/person hierarchy.
    function getUser(dn, callback) {
        var opts = {
            scope: 'sub',
            //'dn',
            attributes: ['l', 'co', 'givenName', 'sn', 'employeeNumber', 'employeeId', 'userPrincipalName', 'extensionAttribute13', 'extensionAttribute15', 'directReports', 'manager']
        };

        client.search(dn, opts, function (err, res) {
            if (err) {
                console.error(err);
                callback();
                return;
            }
            res.on('searchEntry', function (entry) {
                // Execute async so the event handler returns quickly.
                setTimeout(function () {
                    var tmp = entry.object;
                    var directReports = tmp.directReports;
                    person[tmp.dn] = tmp.userPrincipalName;
                    delete tmp['directReports'];
                    delete tmp['controls'];
                    tmp['managerName'] = person[tmp.manager];
                    tmp['directReportCount'] = 0;
                    if (directReports) {
                        if (typeof (directReports) == 'string') {
                            tmp['directReportCount'] = 1;
                        } else {
                            tmp['directReportCount'] = directReports.length;
                        }
                    }
                    //console.error(counter);
                    if (counter > 0) jsonFileStream.write(',');
                    jsonFileStream.write(JSON.stringify(tmp, null, 4));
                    stringifier.write(tmp);
                    counter++;
                    if (counter % 50 == 1) console.log(counter +' users downloaded.');
                    if (directReports) {
                        if (typeof (directReports) == 'string') {
                            q.push(getUserFN(directReports));
                        } else {
                            directReports.forEach(function (person) {
                                q.push(getUserFN(person));
                            }, this);
                        }
                    }
                }, 100);

            });
            res.on('searchReference', function (referral) {
                console.log('referral: ' + referral.uris.join());
            });
            res.on('error', function (err) {
                console.error('error: ' + err.message);
                return;
            });
            res.on('end', function (result) {
                setTimeout(callback, 200);
                return;
            });
        });
    }
    function getUserFN(dn) {
        return function (cb) {
            getUser(dn, cb);
        };
    }
}
