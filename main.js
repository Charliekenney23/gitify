var app = require('app');
var path = require('path');
var ipc = require('ipc');

var ghReleases = require('electron-gh-releases');

require('crash-reporter').start();

var Menu = require('menu');
var Tray = require('tray');
var BrowserWindow = require('browser-window');
var AutoLaunch = require('auto-launch');

var iconIdle = path.join(__dirname, 'images', 'tray-idleTemplate.png');
var iconActive = path.join(__dirname, 'images', 'tray-active.png');

var ghReleasesOptions = {
  repo: 'ekonstantinidis/gitify',
  currentVersion: app.getVersion()
};

var update = new ghReleases(ghReleasesOptions, function (autoUpdater) {
  autoUpdater
    .on('checking-for-update', function() {
      console.log('Checking for update');
    })
    .on('update-downloaded', function (e, rNotes, rName, rDate, uUrl, quitAndUpdate) {
      // Install the update
      console.log('Update Downloaded...');
      quitAndUpdate();
    });
});

// Check for updates
update.check(function (err, status) {
  if (err) {
    console.log('ERRORED.');
    console.log('ERR: ' + err + '. STATUS: ' + status);
  }

  if (!err && status) {
    console.log('There is an update!');
    update.download();
  }
});

// autoUpdater
//
//   .on('update-available', function() {
//     console.log('Update available');
//   })
//   .on('update-not-available', function() {
//     console.log('Update not available');
//   })
//   .on('update-downloaded', function() {
//     console.log('Update downloaded');
//   });

var autoStart = new AutoLaunch({
  name: 'Gitify',
  path: process.execPath.match(/.*?\.app/)[0]
});

app.on('ready', function(){
  var appIcon = new Tray(iconIdle);
  initWindow();

  appIcon.on('clicked', function clicked (e, bounds) {
    if (appIcon.window && appIcon.window.isVisible()) {
      return hideWindow();
    } else {
      showWindow(bounds);
    }
  });

  function initWindow () {
    var defaults = {
      width: 400,
      height: 350,
      show: false,
      frame: false,
      resizable: false,
      'standard-window': false
    };

    appIcon.window = new BrowserWindow(defaults);
    appIcon.window.loadUrl('file://' + __dirname + '/index.html');
    appIcon.window.on('blur', hideWindow);
    appIcon.window.setVisibleOnAllWorkspaces(true);

    initMenu();
  }

  function showWindow (bounds) {
    var options = {
      x: bounds.x - 200 + (bounds.width / 2),
      y: bounds.y,
      index: path.join('./', 'index.html')
    };

    appIcon.window.setPosition(options.x, options.y);
    appIcon.window.show();
  }

  function initMenu () {
    var template = [{
      label: 'Edit',
      submenu: [
        {
          label: 'Copy',
          accelerator: 'Command+C',
          selector: 'copy:'
        },
        {
          label: 'Paste',
          accelerator: 'Command+V',
          selector: 'paste:'
        },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:'
        }
      ]
    }];

    var menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  function hideWindow () {
    if (!appIcon.window) { return; }
    appIcon.window.hide();
  }

  ipc.on('reopen-window', function() {
    appIcon.window.show();
  });

  ipc.on('update-icon', function(event, arg) {
    if (arg === 'TrayActive') {
      appIcon.setImage(iconActive);
    } else {
      appIcon.setImage(iconIdle);
    }
  });

  ipc.on('startup-enable', function() {
    autoStart.enable();
  });

  ipc.on('startup-disable', function() {
    autoStart.disable();
  });

  ipc.on('app-quit', function() {
    app.quit();
  });

  app.dock.hide();
  appIcon.setToolTip('GitHub Notifications on your menu bar.');
});
