const _ = require('lodash');
const Promise = require('bluebird');
const BaseInstance = require('./BaseInstance');
const bosh = require('../../../data-access-layer/bosh');
const utils = require('../../../common/utils');
const mapper = require('./VirtualHostRelationMapper');
const catalog = require('../../../common/models').catalog;
const CONST = require('../../../common/constants');

class VirtualHostInstance extends BaseInstance {
  constructor(guid, manager) {
    super(guid, manager);
    this.director = bosh.director;
    this.mapper = mapper.VirtualHostRelationMapper;
  }

  initialize() {
    /** Here optimization ca be made by checking if this.deploymentName is present
     *  then only make call getDeploymentNameForInstanceId*/
    return this.getDeploymentNameForInstanceId(this.guid)
      .then(deploymentName => this.deploymentName = deploymentName);
  }

  get platformContext() {
    const context = {
      platform: CONST.PLATFORM.CF
    };
    return context;
  }

  getInfo() {
    return this.initialize()
      .then(() => {
        this.parentInstanceId = this.getParentInstanceId();
        return Promise
          .all([
            this.cloudController.getServiceInstance(this.guid),
            this.cloudController.getServiceInstance(this.parentInstanceId),
            this.cloudController.findServicePlanByInstanceId(this.parentInstanceId)
            .then((body) => {
              return new Promise.resolve(catalog.getPlan(body.entity.unique_id));
            })
          ])
          .spread((instance, parent_instance, parent_instance_plan) => ({
            title: `${this.plan.service.metadata.displayName || 'Service'} Dashboard`,
            plan: this.plan,
            service: this.plan.service,
            instance: instance,
            parent_plan: parent_instance_plan,
            parent_instance: parent_instance
          }));
      });
  }

  getDeploymentNameForInstanceId(id) {
    return this.mapper.getDeploymentName(`${id}`);
  }

  getParentInstanceId() {
    return _.nth(_
      .chain(utils.deploymentNameRegExp().exec(this.deploymentName))
      .slice(1)
      .tap(parts => parts[1] = parts.length ? parseInt(parts[1]) : undefined)
      .value(), 2);
  }
}
module.exports = VirtualHostInstance;