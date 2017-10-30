#!/usr/bin/python

import sys
import subprocess
from crypt	  import crypt
from optparse import OptionParser

# Read from stdin
parser = OptionParser()
parser.add_option("--user", dest = "user", default = None,
				  help = "Username")
parser.add_option("--oldpass", dest = "oldpass", default = None,
				  help = "User's current/old password")
parser.add_option("--newpass", dest = "newpass", default = None,
				  help = "User's new password")
(options,args) = parser.parse_args()

# Exit if password or user is not given (required)
if options.user is None:
	print('No username entered')
	exit(11)
if options.oldpass is None:
	print('No current/old password entered')
	exit(12)
if options.newpass is None:
	print('No new password entered')
	exit(13)

# Read data from /etc/shadow file
with open("/etc/shadow") as f:
	content = f.readlines()

# Get password hash for user
encryptedpass = None
for line in content:
	# Extract username and encrypted password string from line
	[u, p] = line.split(':')[0:2];
	if u == options.user:
		encryptedpass = p

# Check input password against correct password (if the user exists)
if encryptedpass is not None:
	# Extract encryption algorithm and salt from encrypted password
	[algorithm, salt] = encryptedpass.split('$')[1:3]
	algorsalt = '$' + algorithm + '$' + salt + '$'		# typ. $6$<salt>$

	# If the password is correct, exit without errors
	if encryptedpass == crypt(options.oldpass, algorsalt):	# encrypt to check
		# Encrypt the new password the same way as the old one was
		newencryptedpass = crypt(options.newpass, algorsalt)
		r = subprocess.call(('usermod', '-p', newencryptedpass, options.user))

		# If update was successful, exit successfully
		if r == 0:
			print('Password set')
			sys.exit(0)
		# If the update failed, exit with an error
		else:
			print('Error setting password')
			sys.exit(-1)

	# If the password is incorrect, exit with an error
	else:
		print('Incorrect Password')
		sys.exit(1)

# If the user doesn't exist, exit with error
else:
	print('User does not exist')
	sys.exit(2)
