var through     = require('through2'),
    path        = require('path'),
    fs          = require('fs'),
    gutil       = require('gulp-util'),
    himalaya    = require('himalaya'),
    objectAssign= require('object-assign');

//模块类型映射
var layoutMap = {
    'a' : 'link',
    'div' : 'struct'
};

//组件类型映射
var componentMap = {
    'div' : 'container',
    'scroller' : 'container',
    'a' : 'link',
    'image' : 'image',
    'text' : 'text',
};

/**
 * 去掉空格
 * @param  {[type]} str [description]
 * @return {[type]}     [description]
 */
function trim(str){
    var result;
    result = str.replace(/(^\s+)|(\s+$)/g,"");
    result = result.replace(/\s/g,"");
    return result;
}

/**
 * 解析文件
 * @param  {[type]} fileContent [description]
 * @return {[type]}             [description]
 */
function parseFiles(fileContent) {
    var tmpJSON = himalaya.parse(fileContent);
    //console.log('tmpJSON:',tmpJSON);

    //再次处理html
    var struct = {};
    var styles = {};
    for(var i in tmpJSON){
        if(tmpJSON[i].tagName == 'template'){ //处理结构
            struct = himalaya.parse(tmpJSON[i].content);
        }
        else if(tmpJSON[i].tagName == 'style'){ //处理样式
            styles = parseStyle(tmpJSON[i].content);
        }
    }
    var outJSON = justifyJson(struct, styles);
    return JSON.stringify(outJSON);
}

/**
 * 调整JSON成我们想要的规范JSON
 * @param  {[type]} struct [description]
 * @param  {[type]} styles [description]
 * @return {[type]}        [description]
 */
function justifyJson(struct, styles){
    var outJSON = {
        layout: [],
        models: {}
    };
    var index = 1;
    for(var i in struct){
        var item = struct[i];
        var outItem = {};
        if(item.tagName && item.type == 'Element'){
            outItem = {
                id : 'layout' + index,
                type : layoutMap[item.tagName] || 'struct',
                name : item.attributes.dataset.role ? item.attributes.dataset.role : 'layout',
                style : getStyle(item, styles),
                children : parseComponent(item.children, styles)
            }
            outJSON.layout.push(outItem);
            outJSON.models[outItem.id] = {
                defalutValue : ''
            }
            index ++;
        }
    }
    return outJSON;
}

/**
 * 解析样式
 * @param  {[type]} styleStr [description]
 * @return {[type]}          [description]
 */
function parseStyle(styleStr){
    var output = {};
    var o = trim(styleStr).split('}');
    for(var i in o){
        var t = o[i].split('{');
        if(t.length == 2){
            var styles = (t[1]).split(';');
            var styleObj = {};
            for(var s in styles){
                var n = styles[s].split(':');
                if(n[0]) styleObj[n[0]] = isNaN(n[1]) ? n[1] : n[1] - 0;
            }
            output[t[0].slice(1)] = styleObj;
        }
    }
    return output;
}

/**
 * 解析子组件
 * @param  {[type]} coms [description]
 * @return {[type]}      [description]
 */
function parseComponent(coms, styles){
    var outComs = [];
    //console.log(JSON.stringify(coms));
    var index = 1;
    for(var i in coms){
        var item = coms[i];
        if(item.type == 'Element'){
            var newCom = {
                id: item.tagName + index,
                type: componentMap[item.tagName] || 'container',
                style: getStyle(item, styles)
            }
            if(item.tagName == 'a' || item.tagName == 'image' || item.tagName == 'text'){
                newCom.props = {
                    value : getValue(item)
                };
            }
            if(item.children && item.children.length){
                var newComChildren = parseComponent(item.children, styles);
                if(newComChildren.length){
                    newCom.children = newComChildren;
                }
            }
            outComs.push(newCom);
            index ++;
        }
    }
    return outComs;
}

/**
 * 获取样式
 * @param  {[type]} com    [description]
 * @param  {[type]} styles [description]
 * @return {[type]}        [description]
 */
function getStyle(com, styles){
    if(com.attributes && com.attributes.className){
        var output = {};
        var clsArr = com.attributes.className;
        for(var i in clsArr){
            output = objectAssign(output, styles[clsArr[i]] || {});
        }
        return output;
    }
    else {
        return {};
    }
}

/**
 * 获取组件的值
 * @param  {[type]} com [description]
 * @return {[type]}     [description]
 */
function getValue(com){
    if(com.tagName == 'image'){
        return com.attributes.src;
    }
    else if(com.tagName == 'a'){
        return com.attributes.href;
    }
    else if(com.tagName == 'text'){
        return com.children[0].content;
    }
}

/**
 * 入口函数
 * @param  {[type]} options  [description]
 * @param  {[type]} settings [description]
 * @return {[type]}          [description]
 */
module.exports = function(options, settings) {
    options = options || {};
    settings = settings || {};

    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            this.push(file);
            return cb();
        }

        if (file.isStream()) {
            this.emit(
                'error',
                new gutil.PluginError('gulp-html2json', 'Streaming not supported')
            );
        }

        options = file.data || options;
        options.filename = file.path;

        try {
            file.contents = new Buffer(
                parseFiles(file.contents.toString(), options)
            );

            if (typeof settings.ext === 'undefined') {
                file.path = gutil.replaceExtension(file.path, '.json');
            }
        } catch (err) {
            this.emit('error', new gutil.PluginError('gulp-html2json', err.toString()));
        }

        this.push(file);
        cb();
    });
};