# ldap-getpeople
Node script.

## Installation
```
npm install ldap-getpeople
```
## Usage

Download the people reporting to the starting manager using the Active Directory attribute directReports. 
Recursively go down the tree to get each manager in the tree.
Usage: ldap-getpeople [[OPTION]]

  -l, --ldap=LDAP_URL      URL to connect to LDAP server. Examples ldap://130.140.80.134:389 or ldaps://130.140.80.134:689
  -u, --user=USER_DN       User DN (distinguished name) to logon to the Active Directory/LDAP server.
  -p, --password=PASSWORD  PASSWORD for the user to logon to the Active Directory/LDAP server. If not used, the program prompts you for a password
  -m, --manager=USER_DN    The User DN (distinguished name) of the topmost manager.
  -o, --output=FILENAME    Save results as tab delimited to FILENAME.tsv. The default is results.tsv.
  -j, --json=FILENAME      Save results as JSON to FILENAME. The default is results.json
  -h, --help               display this help

## Issues and repository
https://github.com/divyavanmahajan/ldap-getpeople
