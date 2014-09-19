'use strict';

var mongoose = require('mongoose-q')(require('mongoose'));
var _ = require('lodash');
var q = require('q');

var ObjectId = mongoose.Types.ObjectId;

var TrainingCourse = mongoose.model('TrainingCourse');

exports.getCourses = function() {
    return TrainingCourse.find().execQ();
};

exports.getCourse = function(courseId) {
    return TrainingCourse.findByIdQ(courseId);
};

exports.createCourse = function(courseData) {
    var newCourse = new TrainingCourse(courseData);
    return newCourse.saveQ();
};

exports.updateCourse = function(courseId, courseData) {
    var data = _.cloneDeep(courseData);
    data = _.omit(data, '_id');
    data = _.omit(data, '__v');

    return TrainingCourse.updateQ({'_id': new ObjectId(courseId)}, data, {upsert: true});
};

exports.deleteCourse = function(courseId) {
    return TrainingCourse.removeQ({'_id': new ObjectId(courseId)});
};
