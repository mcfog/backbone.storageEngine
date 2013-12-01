PACKAGE =
  core:
    describe: "minimal codebase with no implemention"
    deps: ['SE', 'SE.Adapter', 'SE.Engine']
  localstorage:
    describe: "simple drop-replace to backbone.localStorage"
    deps: ['core', 'SE.Engine.LocalStorage']
  chromestorage:
    describe: "simple drop-replace to backbone.chromestorage"
    deps: ['core', 'SE.Engine.ChromeStorage']
  latebind:
    describe: "the latebind router"
    deps: ['core', 'SE.Router', 'SE.Router.LateBind']
  default:
    describe: "default build"
    deps: ['localstorage', 'latebind']
  full:
    describe: "full build"
    deps: ['default', 'chromestorage']

module.exports = (grunt)->
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-docco'

  grunt.initConfig
    jshint:
      src:
        files:
          src: ['src/**/*.js']
    uglify:
      dist:
        files: [{
          expand: true
          cwd: 'dist/'
          src: ['**/*.js']
          dest: 'dist/'
          ext: '.min.js'
        }]
    docco:
      dist:
        src: ['dist/latebind-plain/backbone-storageEngine.js']
        options:
          output: 'docs/'

  task_source = (pkgName)->
    _ = grunt.util._
    expand = (pkgName)->
      if -1 isnt pkgName.indexOf ','
        (_.chain || _)(pkgName.split ',').map (pkg)->
          expand pkg
        .flatten().uniq().value()
      else if !PACKAGE[pkgName]
        [pkgName]
      else
        (_.chain || _)(PACKAGE[pkgName].deps).map (sub)->
          expand sub
        .flatten().uniq().value()

    source = _.map (expand pkgName), (file)->
      grunt.file.read "src/#{file}.js"
    .join "\n"

    grunt.file.write "tmp/#{pkgName}.source", source

  task_dist = (pkgName, wrapperName)->
    task_source pkgName
    source = grunt.file.read "tmp/#{pkgName}.source"
    wrapSource = grunt.file.read "wrapper/#{wrapperName}.js"

    source = wrapSource.replace '//{source}', source.replace /\n/g, (ch, index)->
      if (source[index + 1] is "\n") || (source[index + 1] is undefined)
        '\n'
      else
        '\n  '
    source = "//pkg=#{pkgName}, wrapper=#{wrapperName}\n\n" + source
    grunt.file.write "dist/#{pkgName}-#{wrapperName}/backbone-storageEngine.js", source

  task_clean = ->
    grunt.file.delete 'dist'
    grunt.file.delete 'tmp'

  grunt.util.linefeed = '\n'
  grunt.registerTask 'source', task_source
  grunt.registerTask 'dist', task_dist
  grunt.registerTask 'clean', task_clean
  grunt.registerTask 'default', ['jshint', 'clean', 'dist:default:plain', 'dist:core:plain', 'dist:full:plain', 'dist:latebind:plain', 'uglify', 'docco']
