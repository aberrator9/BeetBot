const fs = require('fs');
const timespan = 1000;
const inputDir = './input';
const outputDir = './output';

function poll() {
	setInterval(() => {
		fs.readdir(inputDir, (err, files) => {
			if (files.length <= 0) {
				console.log('No files in', inputDir);
				return;
			}

			let oldest = '';
			let oldestTime = -1;

			files.forEach(file => {
				fs.stat(inputDir + '/' + file, (err, stats) => {
					const ctime = stats.ctimeMs;

					if (ctime > oldestTime) {
						oldestTime = ctime;
						oldest = file;
					}

					if (file === files[files.length - 1]) {
						fs.rename(inputDir + '/' + oldest, outputDir + '/' + oldest, function (err) {
							console.log(oldest + 'posted');

							// Instagram posting logic
						})
					}
				});
			});
		});
	}, timespan);
}

poll();
