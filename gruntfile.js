module.exports = function(grunt){
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.initConfig({
		uglify: {
			build:{
				files: {
					'validate-rules.min.js': ['validate-rules.js']
				}
			}
		}
	});

	grunt.registerTask('default', 	['uglify']);
};