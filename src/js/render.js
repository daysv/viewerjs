import {
  CLASS_TRANSITION,
  EVENT_LOAD,
  EVENT_TRANSITION_END,
  EVENT_VIEWED,
} from './constants';
import {
  addClass,
  addListener,
  each,
  empty,
  extend,
  getImageNameFromURL,
  getImageNaturalSizes,
  getTransforms,
  isFunction,
  isString,
  proxy,
  removeClass,
  setData,
  setStyle,
  getPosition,
} from './utilities';

export default {
  render() {
    this.initContainer();
    this.initViewer();
    this.initList();
    this.renderViewer();
  },

  initContainer() {
    this.containerData = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  },

  initViewer() {
    const { options, parent } = this;
    let viewerData;

    if (options.inline) {
      viewerData = {
        width: Math.max(parent.offsetWidth, options.minWidth),
        height: Math.max(parent.offsetHeight, options.minHeight),
      };

      this.parentData = viewerData;
    }

    if (this.fulled || !viewerData) {
      viewerData = this.containerData;
    }

    this.viewerData = extend({}, viewerData);
  },

  renderViewer() {
    if (this.options.inline && !this.fulled) {
      setStyle(this.viewer, this.viewerData);
    }
  },

  initList() {
    const { element, options, list } = this;
    const items = [];

    each(this.images, (image, i) => {
      const { src } = image;
      const alt = image.alt || getImageNameFromURL(src);
      let { url } = options;

      if (isString(url)) {
        url = image.getAttribute(url);
      } else if (isFunction(url)) {
        url = url.call(image, image);
      }

      if (src || url) {
        items.push('<li>' +
          '<img' +
            ` src="${src || url}"` +
            ' role="button"' +
            ' data-action="view"' +
            ` data-index="${i}"` +
            ` data-original-url="${url || src}"` +
            ` alt="${alt}"` +
          '>' +
        '</li>');
      }
    });

    list.innerHTML = items.join('');

    each(list.getElementsByTagName('img'), (image) => {
      setData(image, 'filled', true);
      addListener(image, EVENT_LOAD, proxy(this.loadImage, this), {
        once: true,
      });
    });

    this.items = list.getElementsByTagName('li');

    if (options.transition) {
      addListener(element, EVENT_VIEWED, () => {
        addClass(list, CLASS_TRANSITION);
      }, {
        once: true,
      });
    }
  },

  renderList(index) {
    const i = index || this.index;
    const width = this.items[i].offsetWidth || 30;
    const outerWidth = width + 1; // 1 pixel of `margin-left` width

    // Place the active item in the center of the screen
    setStyle(this.list, {
      width: outerWidth * this.length,
      marginLeft: ((this.viewerData.width - width) / 2) - (outerWidth * i),
    });
  },

  resetList() {
    empty(this.list);
    removeClass(this.list, CLASS_TRANSITION);
    setStyle({
      marginLeft: 0,
    });
  },

  initImage(callback) {
    const { options, image, viewerData } = this;
    const footerHeight = this.footer.offsetHeight;
    const viewerWidth = viewerData.width;
    const viewerHeight = Math.max(viewerData.height - footerHeight, footerHeight);
    const oldImageData = this.ImageData || {};

    getImageNaturalSizes(image, (naturalWidth, naturalHeight) => {
      const aspectRatio = naturalWidth / naturalHeight;
      let width = viewerWidth;
      let height = viewerHeight;

      if (viewerHeight * aspectRatio > viewerWidth) {
        height = viewerWidth / aspectRatio;
      } else {
        width = viewerHeight * aspectRatio;
      }

      width = Math.min(width * 0.9, naturalWidth);
      height = Math.min(height * 0.9, naturalHeight);

      const imageData = {
        naturalWidth,
        naturalHeight,
        aspectRatio,
        ratio: width / naturalWidth,
        width,
        height,
        left: (viewerWidth - width) / 2,
        top: (viewerHeight - height) / 2,
      };
      const initialImageData = extend({}, imageData);

      if (options.rotatable) {
        imageData.rotate = oldImageData.rotate || 0;
        initialImageData.rotate = 0;
      }

      if (options.scalable) {
        imageData.scaleX = oldImageData.scaleX || 1;
        imageData.scaleY = oldImageData.scaleY || 1;
        initialImageData.scaleX = 1;
        initialImageData.scaleY = 1;
      }

      this.imageData = imageData;
      this.initialImageData = initialImageData;

      if (isFunction(callback)) {
        callback();
      }
    });
  },

  renderImage(callback) {
    const { image, imageData } = this;

    requestAnimationFrame(() => {
      let position;

      const imageWidth = imageData.width;
      const imageHeight = imageData.height;
      const clientWidth = window.innerWidth;
      const clientHeight = window.innerHeight;

      if (imageData.width < clientWidth && imageData.height < clientHeight) {
        imageData.left = (clientWidth - imageWidth) / 2;
        imageData.top = (clientHeight - imageHeight) / 2;
      } else {
        if (imageData.rotate % 180 === 0) {
          position = getPosition(clientWidth, clientHeight, imageWidth, imageHeight, imageData.left, imageData.top);
          imageData.left = position.left;
          imageData.top = position.top;
        } else {
          var rotateLeft = imageData.left - (imageData.height - imageWidth ) / 2;
          var rotateTop = imageData.top - (imageData.width - imageHeight ) / 2;

          position = getPosition(clientWidth, clientHeight, imageHeight, imageWidth, rotateLeft, rotateTop);
          imageData.left = position.left + (imageHeight - imageWidth) / 2;
          imageData.top = position.top + (imageWidth - imageHeight) / 2;
        }
      }

      setStyle(image, extend({
        width: imageWidth,
        height: imageHeight,
        marginLeft: imageData.left,
        marginTop: imageData.top,
      }, getTransforms(imageData)));
    });

    if (isFunction(callback)) {
      if (this.transitioning) {
        addListener(image, EVENT_TRANSITION_END, callback, {
          once: true,
        });
      } else {
        callback();
      }
    }
  },

  resetImage() {
    const { image } = this;

    // this.image only defined after viewed
    if (image) {
      image.parentNode.removeChild(image);
      this.image = null;
    }
  },
};
