"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var zen_observable_ts_1 = __importDefault(require("zen-observable-ts"));
var core_1 = require("@aws-amplify/core");
var datastoreReachability_1 = require("./datastoreReachability");
var logger = new core_1.ConsoleLogger('DataStore');
var RECONNECTING_IN = 5000; // 5s this may be configurable in the future
var DataStoreConnectivity = /** @class */ (function () {
    function DataStoreConnectivity() {
        this.connectionStatus = {
            online: false,
        };
    }
    DataStoreConnectivity.prototype.status = function () {
        var _this = this;
        if (this.observer) {
            throw new Error('Subscriber already exists');
        }
        return new zen_observable_ts_1.default(function (observer) {
            _this.observer = observer;
            // Will be used to forward socket connection changes, enhancing Reachability
            _this.subscription = datastoreReachability_1.ReachabilityMonitor.subscribe(function (_a) {
                var online = _a.online;
                _this.connectionStatus.online = online;
                var observerResult = __assign({}, _this.connectionStatus); // copyOf status
                observer.next(observerResult);
            });
            return function () {
                _this.unsubscribe();
            };
        });
    };
    DataStoreConnectivity.prototype.unsubscribe = function () {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    };
    DataStoreConnectivity.prototype.socketDisconnected = function () {
        var _this = this;
        if (this.observer && typeof this.observer.next === 'function') {
            this.observer.next({ online: false }); // Notify network issue from the socket
            setTimeout(function () {
                var observerResult = __assign({}, _this.connectionStatus); // copyOf status
                _this.observer.next(observerResult);
            }, RECONNECTING_IN); // giving time for socket cleanup and network status stabilization
        }
    };
    return DataStoreConnectivity;
}());
exports.default = DataStoreConnectivity;
//# sourceMappingURL=datastoreConnectivity.js.map