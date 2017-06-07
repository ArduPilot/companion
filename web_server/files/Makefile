all:
	@echo "Generating embedded.c"
	@./embed.py *.html images/*.svg */*.js */*.json */*.css */*.jpg */*.png */*.mjpg data/*.xml
	@echo "Generating manifest"
	@./gen_manifest.sh
	@echo "Generating version.h"
	@./gen_version.sh

