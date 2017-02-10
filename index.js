'use strict';

var through = require('through2');
var path = require('path');
var File = require('vinyl');
var Concat = require('concat-with-sourcemaps');

// file can be a vinyl file object or a string
// when a string it will construct a new one
module.exports = function(file, opt) {
	if (!file) {
		throw new Error('gulp-concat: Missing file option');
	}
	opt = opt || {};

	// to preserve existing |undefined| behaviour and to introduce |newLine: ""| for binaries
	if (typeof opt.newLine !== 'string') {
		opt.newLine = '\n';
	}

	var isUsingSourceMaps = false;
	var latestFile;
	var latestMod;
	var fileName;
	var concat;

	if (typeof file === 'string') {
		fileName = file;
	} else if (typeof file.path === 'string') {
		fileName = path.basename(file.path);
	} else {
		throw new Error('gulp-concat: Missing path in file options');
	}

	var fileMap = [];
	var mapName = opt.mapName || 'embed_file';
	var dataEntry = opt.dataEntry || 'const unsigned char ' + mapName + '_{0}_data[] = { "{1}" };';
	var idx = 0;

	function bytesToHex(bytes) {
		for (var hex = [], i = 0; i < bytes.length; i++) {
			hex.push("\\x");
			hex.push((bytes[i] >>> 4).toString(16));
			hex.push((bytes[i] & 0xF).toString(16));
		}
		return hex.join("");
	}

	function bufferContents(file, enc, cb) {
		// ignore empty files
		if (file.isNull()) {
			cb();
			return;
		}

		// we don't do streams (yet)
		if (file.isStream()) {
			this.emit('error', new Error('gulp-concat: Streaming not supported'));
			cb();
			return;
		}

		// enable sourcemap support for concat
		// if a sourcemap initialized file comes in
		if (file.sourceMap && isUsingSourceMaps === false) {
			isUsingSourceMaps = true;
		}

		// set latest file if not already set,
		// or if the current file was modified more recently.
		if (!latestMod || file.stat && file.stat.mtime > latestMod) {
			latestFile = file;
			latestMod = file.stat && file.stat.mtime;
		}

		// construct concat instance
		if (!concat) {
			concat = new Concat(isUsingSourceMaps, fileName, opt.newLine);
		}

		// transform content to C-array
		file.contents = new Buffer(dataEntry.replace("{0}", idx).replace("{1}", bytesToHex(file.contents)));

		// add file to concat instance
		concat.add(file.relative, file.contents, file.sourceMap);
		fileMap.push([idx, file.relative, file.stat.size]);
		idx++;
		cb();
	}

	var mapEntry = (opt.mapEntry || '{ (unsigned char *)"{0}", {1}, (unsigned char *)&' + mapName + '_{2}_data }');

	function endStream(cb) {
		// no files passed in, no file goes out
		if (!latestFile || !concat) {
			cb();
			return;
		}

		var joinedFile;

		// if file opt was a file path
		// clone everything from the latest file
		if (typeof file === 'string') {
			joinedFile = latestFile.clone({contents: false});
			joinedFile.path = path.join(latestFile.base, file);
		} else {
			joinedFile = new File(file);
		}

		var joinedExtra = '';

		if (opt.withStruct) {
			var struct = 'struct ' + mapName + '_t {\n' +
				     '\tunsigned char *name;\n' +
				     '\tunsigned int size;\n' +
				     '\tunsigned char *ptr;\n' +
				     '} ' + mapName + '_t;\n';
			joinedExtra =+ struct;
		}

		if (opt.withMap) {
			var mapped;
			if (fileMap.length) {
				mapped = '\nstruct ' + mapName + '_t ' + mapName + '[] = {\n';
				Object.keys(fileMap).forEach(function(o) {
					var lastFile = (o == fileMap.length-1);
					o = fileMap[o];
					mapped += '\t' + mapEntry.replace("{0}", o[1]).replace("{1}", o[2]).replace("{2}", o[0]) + (lastFile ? "" : ",") + '\n';
				});
				mapped += '};\n';
			}
			joinedExtra =+ mapped;
		}

		joinedFile.contents = Buffer.concat([concat.content, new Buffer(joinedExtra)]);

		if (concat.sourceMapping) {
			joinedFile.sourceMap = JSON.parse(concat.sourceMap);
		}

		this.push(joinedFile);
		cb();
	}

	return through.obj(bufferContents, endStream);
};
