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
					'form-rules.min.js': ['form-rules.js']
				}
			}
		}
	});

	grunt.registerTask('default', 	['uglify']);
};