const { Staff } = require('../models/staff');
const { Site } = require('../models/site');
const { App } = require('../models/app');

const path = require('path');
const git = require('nodegit');
const uuidV4 = require('uuid/v4');
const validator = require('validator');
const colors = require('colors');

const repoDir = './client/theme';

exports.getThemesJson = (req, res, next) => {
  const errors = [];
  const site = req.app.get('site');
  const repo = req.app.get('repo');
  // Get branch list
  repo.getReferenceNames(1).then(function(branchRefs) {
    const themes = branchRefs.map((branchRef) => branchRef.replace('refs/heads/', ''))
    console.log(`[status] ${themes.join(', ')}`.grey);
    App.authenticate(req.body.key, req.body.password, (error, app) => {
      if (error || !app) {
        return res.json({
          status: 'error: Could not establish a connection'
        });
      } else {
        if (app.themes === 'none') {
          return res.json({
            status: 'error: This app does not have permission to read themes'
          });
        } else {
          return res.json({
            status: 'success',
            themes
          });
        }
      }
    });
  })
}

exports.getThemeFilesJson = (req, res) => {
  console.log('[status] Getting theme json')
  App.authenticate(req.body.key, req.body.password, (error, app) => {
    if (error || !app) {
      return res.json({
        status: 'error: Could not establish a connection'
      });
    } else {
      console.log('[status] App authenticated')
      const errors = [];
      const site = req.app.get('site');
      const fileTree = {
        assets: [],
        layouts: [],
        templates: [],
        snippets: [],
      };
      git.Repository.open(path.resolve(repoDir))
      .then(function(repo) {
        return repo.getMasterCommit();
      })
      .then(function(firstCommitOnMaster) {
        return firstCommitOnMaster.getTree();
      })
      .then(function(tree) {
        return new Promise(resolve => {
          const walker = tree.walk();
          walker.on('entry', entry => {
            const paths = entry.path().split('/')
            if (paths.length === 2) {
              const parent = paths[0];
              const child = paths[1]
              fileTree[parent].push(child);
            }
          });
          walker.on('end', trees => {
            resolve(fileTree)
          })
          walker.start();
        })
      })
      .done(function() {
        if (app.themes === 'none') {
          return res.json({
            status: 'error: This app does not have permission to read themes'
          });
        } else {
          return res.json({
            status: 'success',
            theme: fileTree
          });
        }
      });
    }
  });
}

exports.getFileJson = (req, res, next) => {
  App.authenticate(req.body.key, req.body.password, (error, app) => {
    if (error || !app) {
      return res.json({
        status: 'error: Could not establish a connection'
      });
    } else {
      const { theme, key, file } = req.params;
      git.Repository.open(path.resolve(repoDir))
      .then(function(repo) {
        return repo.getMasterCommit();
      })
      .then(function(commit) {
        return commit.getEntry(`${key}/${file}`);
      })
      .then(function(entry) {
        _entry = entry;
        return _entry.getBlob();
      })
      .then(function(blob) {
        return res.json({
          status: 'success',
          file: blob.toString()
        });
      })
      .done();
    }
  });
}