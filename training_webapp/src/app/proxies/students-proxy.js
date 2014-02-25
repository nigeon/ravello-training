'use strict';

angular.module('trng.proxies').factory('trng.proxies.StudentsProxy', [
    '$http',
    '$q',
    'app.config',
    'trainingTracker',
    function($http, $q, config, trainingTracker) {
        var service = {
            getStudent: function(studentId) {
                var promise = $http.get(config.baseUrl + '/rest/students/' + studentId);
                trainingTracker.addPromise(promise);
                return promise;
            },

            getStudentClass: function(studentId, classId) {
                var promise = $http.get(config.baseUrl + '/rest/students/' + studentId + '/class/' + classId);
                trainingTracker.addPromise(promise);
                return promise;
            },

            getStudentClassApps: function(studentId, classId) {
                var promise = $http.get(config.baseUrl + '/rest/students/' + studentId + '/class/' + classId + '/apps');
                trainingTracker.addPromise(promise);
                return promise;
            },

            getStudentClassSingleApp: function(studentId, classId, appId, track) {
                // By default, try tracking.
                if (_.isUndefined(track) || _.isNull(track)) {
                    track = true;
                }

                var promise = $http.get(config.baseUrl + '/rest/students/' + studentId + '/class/' + classId + '/apps/' + appId);

                if (track) {
                    trainingTracker.addPromise(promise);
                }

                return promise;
            }
        };

        return service;
    }
]);
