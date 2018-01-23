import { collect, sum, bool, equal } from '@ember/object/computed';
import { computed } from '@ember/object';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { belongsTo, hasMany } from 'ember-data/relationships';
import { fragmentArray } from 'ember-data-model-fragments/attributes';
import sumAggregation from '../utils/properties/sum-aggregation';

export default Model.extend({
  region: attr('string'),
  name: attr('string'),
  plainId: attr('string'),
  type: attr('string'),
  priority: attr('number'),
  allAtOnce: attr('boolean'),

  status: attr('string'),
  statusDescription: attr('string'),
  createIndex: attr('number'),
  modifyIndex: attr('number'),

  periodic: attr('boolean'),
  parameterized: attr('boolean'),

  datacenters: attr(),
  taskGroups: fragmentArray('task-group', { defaultValue: () => [] }),
  taskGroupSummaries: fragmentArray('task-group-summary'),

  // Aggregate allocation counts across all summaries
  queuedAllocs: sumAggregation('taskGroupSummaries', 'queuedAllocs'),
  startingAllocs: sumAggregation('taskGroupSummaries', 'startingAllocs'),
  runningAllocs: sumAggregation('taskGroupSummaries', 'runningAllocs'),
  completeAllocs: sumAggregation('taskGroupSummaries', 'completeAllocs'),
  failedAllocs: sumAggregation('taskGroupSummaries', 'failedAllocs'),
  lostAllocs: sumAggregation('taskGroupSummaries', 'lostAllocs'),

  allocsList: collect(
    'queuedAllocs',
    'startingAllocs',
    'runningAllocs',
    'completeAllocs',
    'failedAllocs',
    'lostAllocs'
  ),

  totalAllocs: sum('allocsList'),

  pendingChildren: attr('number'),
  runningChildren: attr('number'),
  deadChildren: attr('number'),

  versions: hasMany('job-versions'),
  allocations: hasMany('allocations'),
  deployments: hasMany('deployments'),
  evaluations: hasMany('evaluations'),
  namespace: belongsTo('namespace'),

  hasPlacementFailures: bool('latestFailureEvaluation'),

  latestEvaluation: computed('evaluations.@each.modifyIndex', 'evaluations.isPending', function() {
    const evaluations = this.get('evaluations');
    if (!evaluations || evaluations.get('isPending')) {
      return null;
    }
    return evaluations.sortBy('modifyIndex').get('lastObject');
  }),

  latestFailureEvaluation: computed(
    'evaluations.@each.modifyIndex',
    'evaluations.isPending',
    function() {
      const evaluations = this.get('evaluations');
      if (!evaluations || evaluations.get('isPending')) {
        return null;
      }

      const failureEvaluations = evaluations.filterBy('hasPlacementFailures');
      if (failureEvaluations) {
        return failureEvaluations.sortBy('modifyIndex').get('lastObject');
      }
    }
  ),

  supportsDeployments: equal('type', 'service'),

  runningDeployment: computed('deployments.@each.status', function() {
    return this.get('deployments').findBy('status', 'running');
  }),

  fetchRawDefinition() {
    return this.store.adapterFor('job').fetchRawDefinition(this);
  },

  statusClass: computed('status', function() {
    const classMap = {
      pending: 'is-pending',
      running: 'is-primary',
      dead: 'is-light',
    };

    return classMap[this.get('status')] || 'is-dark';
  }),
});
