// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

var winston
var nodemailer
var transporter

var severity = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
}

var action = {
  SENDEMAIL: 0,
  PRINTCONSOLE: 1,
  PRINTFILE: 2
}

var mediumSevCount = 0
var lowSevCount = 0

// setup winston logger to log it to file or console
// Setup node mailers to generate email alerts to
// send emails in case of errors.
var alertMode
function setupAlertSystem (alert) {
  if (alert.mode === 'EMAIL') {
    nodemailer = require('nodemailer')
    transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'gmail account',
        pass: 'password'
      }
    })
    alertMode = alert.mode
  } else {
    winston = require('winston')
    if (alert.mode === 'FILE') {
      winston.add(winston.transports.file, {filename: alert.filename})
      winston.remove(winston.transports.Console)
    }
    alertMode = alert.mode
  }
}

function handleAlert (alertInfo, sev) {
  var generateAlert = false
  switch (sev) {
    case severity.HIGH:
      generateAlert = true
      break
    case severity.MEDIUM:
      mediumSevCount++
      if (mediumSevCount % 3 === 0) {
        generateAlert = true
      }
      break
    case severity.LOW:
      lowSevCount++
      if (lowSevCount % 6 === 0) {
        generateAlert = true
      }
      break
    default:
      // do nothing
      break
  }
  if (generateAlert) {
    if (alertMode === 'EMAIL') {
      // send an email.
      var email = {
        from: 'Aerospike alert account',
        to: 'gayathri@aerospike.com',
        subject: 'Nodejs Longevity Alert',
        text: JSON.stringify(alertInfo)
      }
      transporter.sendMail(email, function (error, info) {
        if (error) {
          console.log(error)
        }
      })
    } else if (alertMode === 'FILE' || alertMode === 'CONSOLE') {
      winston.info(alertInfo)
    }
  } else {
    // should we store the temporary information in some structure.
  }
}

module.exports = {
  handleAlert: handleAlert,
  setupAlertSystem: setupAlertSystem,
  severity: severity,
  action: action
}
