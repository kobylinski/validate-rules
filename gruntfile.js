module.exports = function(grunt){
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.initConfig({
		uglify: {
			options: {
				compress: {
					drop_console: true
				},
			},
			build:{
				files: {
					'validate-rules.min.js': ['validate-rules.js']
				}
			}
		}
	});

	grunt.registerTask('default', 	['uglify']);
};