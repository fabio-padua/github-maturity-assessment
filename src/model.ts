import { en } from './i18n/en'
export type Rating = 0 | 1 | 2 | 3 | 4
export type Answer = {
  value: Rating | 'na' | null
  evidence: string
}
export const platforms = ['github', 'azure-devops', 'gitlab', 'bitbucket', 'mixed', 'other'] as const
export type Platform = typeof platforms[number] | ''
export type Assessment = {
  id: string
  customer: string
  facilitator: string
  date: string
  platform: Platform
  otherPlatform: string
  hosting: 'cloud' | 'server' | 'undecided'
  githubPlan: 'none' | 'business' | 'enterprise' | 'undecided'
  developers: number
  answers: Record<string, Answer>
  sample: boolean
  updatedAt: string
}
export type Question = {
  id: string
  title: string
  why: string
  options: [
    string,
    string,
    string,
    string,
    string
  ]
  action: string
  evidence: string
  critical?: boolean
}
export type Pillar = {
  id: string
  name: string
  short: string
  weight: number
  description: string
  color: string
  questions: Question[]
}
export const pillars: Pillar[] = [
  {
    id: 'governance', name: en["model.enterprise_governance"], short: en["ui.governance"], weight: 20,
    description: en["model.a_controlled_foundation_for_your_organizations_identities_and_repositories"], color: '#58a6ff',
    questions: [
      { id: 'identity', title: en["model.how_is_access_to_your_development_platform_managed"], why: en["model.central_identity_and_joiner_mover_leaver_controls_reduce_unauthorized"],
        options: [en["model.individual_accounts_no_consistent_access_policy"], en["model.documented_access_guidelines_applied_manually"], en["model.sso_and_mfa_enforced_for_most_users"], en["model.sso_mfa_and_automated_provisioning_enforced"], en["model.lifecycle_controls_continuously_reviewed_and_audited"]], critical: true,
        action: en["model.enforce_sso_and_mfa_define_a_joiner_mover_leaver"], evidence: en["model.identity_policy_sso_configuration_recent_access_review"] },
      { id: 'ownership', title: en["model.how_clearly_are_organizations_and_repositories_owned"], why: en["model.ownership_connects_platform_decisions_to_accountable_people"],
        options: [en["model.no_reliable_inventory_or_ownership"], en["model.partial_inventory_ownership_is_informal"], en["model.most_repositories_have_owners_and_a_purpose"], en["model.complete_inventory_ownership_and_lifecycle_policies"], en["model.ownership_and_lifecycle_compliance_monitored_automatically"]],
        action: en["model.create_a_repository_inventory_with_owners_purpose_sensitivity_and"], evidence: en["model.repository_inventory_ownership_matrix"] },
      { id: 'policies', title: en["model.how_are_repository_standards_enforced"], why: en["model.consistent_guardrails_make_safe_delivery_repeatable"],
        options: [en["model.no_common_standards"], en["model.standards_documented_but_optional"], en["model.branch_rules_and_reviews_on_important_repositories"], en["model.organization_wide_rulesets_and_reusable_templates"], en["model.policy_as_code_with_exceptions_monitoring_and_review"]],
        action: en["model.pilot_shared_rulesets_for_reviews_protected_branches_and_controlled"], evidence: en["model.rulesets_repository_templates_exception_register"] },
      { id: 'audit', title: en["model.how_are_platform_activity_and_permissions_reviewed"], why: en["model.auditability_is_needed_to_investigate_incidents_and_demonstrate_control"],
        options: [en["model.logs_and_permissions_are_not_reviewed"], en["model.ad_hoc_investigation_when_issues_occur"], en["model.scheduled_access_reviews_and_retained_audit_logs"], en["model.audit_logs_integrated_with_monitoring_and_named_owners"], en["model.automated_detection_response_and_control_evidence"]],
        action: en["model.assign_an_audit_owner_set_retention_requirements_and_schedule"], evidence: en["model.audit_retention_policy_siem_integration_access_reviews"] },
      { id: 'licensing', title: en["model.how_are_github_and_copilot_licenses_governed"], why: en["model.license_ownership_and_utilization_make_commercial_planning_credible"],
        options: [en["model.seat_counts_and_owners_are_unknown"], en["model.seats_tracked_manually_without_utilization_reviews"], en["model.owners_and_periodic_seat_reconciliation_established"], en["model.utilization_and_allocation_reviewed_with_procurement"], en["model.forecasting_and_ongoing_optimization_tied_to_adoption"]],
        action: en["model.reconcile_assigned_seats_active_use_plan_eligibility_and_procurement"], evidence: en["model.seat_inventory_utilization_report_purchasing_agreement"] },
    ],
  },
  {
    id: 'security', name: en["model.security_devsecops"], short: en["ui.devsecops"], weight: 20,
    description: en["model.security_controls_that_protect_code_credentials_and_the_software"], color: '#3dd6c6',
    questions: [
      { id: 'secrets', title: en["model.how_are_exposed_secrets_prevented_and_remediated"], why: en["model.leaked_credentials_can_bypass_otherwise_strong_platform_controls"],
        options: [en["model.no_scanning_or_response_process"], en["model.manual_checks_and_ad_hoc_credential_rotation"], en["model.secret_scanning_and_an_owned_response_process"], en["model.push_protection_and_rotation_workflows_broadly_applied"], en["model.coverage_and_response_times_continuously_monitored"]], critical: true,
        action: en["model.enable_supported_secret_scanning_and_push_protection_then_rehearse"], evidence: en["model.scanning_coverage_push_protection_settings_response_runbook"] },
      { id: 'code-security', title: en["model.how_is_code_analyzed_for_vulnerabilities"], why: en["model.analysis_only_creates_value_when_findings_reach_remediation"],
        options: [en["model.no_systematic_code_analysis"], en["model.occasional_manual_or_tool_based_reviews"], en["model.automated_analysis_for_critical_repositories"], en["model.analysis_in_pull_requests_with_owned_remediation_slas"], en["model.risk_based_coverage_and_remediation_performance_tracked"]],
        action: en["model.pilot_code_scanning_on_critical_repositories_and_assign_risk"], evidence: en["model.code_scanning_configuration_triage_workflow_sla"] },
      { id: 'dependencies', title: en["model.how_are_vulnerable_dependencies_managed"], why: en["model.third_party_components_are_part_of_your_production_risk"],
        options: [en["model.dependencies_not_inventoried_or_monitored"], en["model.manual_checks_during_releases"], en["model.automated_alerts_and_an_assigned_triage_owner"], en["model.automated_update_prs_with_tested_remediation_workflows"], en["model.supply_chain_policy_provenance_and_measurable_slas"]],
        action: en["model.inventory_dependencies_enable_alerts_and_update_automation_and_prioritize"], evidence: en["model.dependency_alerts_update_configuration_remediation_backlog"] },
      { id: 'pipeline-security', title: en["model.how_are_ci_cd_credentials_and_execution_protected"], why: en["model.build_systems_often_have_privileged_paths_to_production"],
        options: [en["model.shared_long_lived_credentials_and_unrestricted_runners"], en["model.some_credentials_scoped_runner_controls_inconsistent"], en["model.scoped_permissions_protected_environments_managed_secrets"], en["model.short_lived_federation_and_hardened_runner_boundaries"], en["model.trust_boundaries_and_provenance_continuously_verified"]], critical: true,
        action: en["model.reduce_workflow_permissions_protect_deployment_environments_and_adopt_short"], evidence: en["model.workflow_permissions_runner_topology_environment_rules"] },
      { id: 'incident', title: en["model.how_ready_is_the_team_to_respond_to_a"], why: en["model.a_clear_response_plan_reduces_the_impact_of_a"],
        options: [en["model.no_response_ownership_or_runbook"], en["model.owners_identified_response_is_improvised"], en["model.documented_runbooks_and_escalation_paths"], en["model.regular_exercises_with_recovery_and_communication_plans"], en["model.exercises_and_incidents_feed_measured_improvements"]],
        action: en["model.write_and_exercise_a_platform_incident_runbook_covering_credential"], evidence: en["model.runbook_exercise_notes_recovery_objectives"] },
    ],
  },
  {
    id: 'delivery', name: en["model.delivery_automation"], short: en["ui.delivery"], weight: 15,
    description: en["model.repeatable_pipelines_and_safe_observable_paths_from_a_change"], color: '#a58aff',
    questions: [
      { id: 'ci', title: en["model.how_consistently_are_builds_and_tests_automated"], why: en["model.repeatable_validation_is_the_baseline_for_reliable_delivery"],
        options: [en["model.builds_and_tests_mostly_manual"], en["model.automation_exists_for_a_few_teams"], en["model.most_active_repositories_run_ci_for_pull_requests"], en["model.reusable_maintained_ci_workflows_used_broadly"], en["model.ci_quality_speed_and_coverage_measured_and_improved"]],
        action: en["model.create_a_reusable_pull_request_build_and_test_workflow"], evidence: en["model.pipeline_inventory_test_runs_reusable_workflows"] },
      { id: 'deployment', title: en["model.how_safe_and_repeatable_are_production_deployments"], why: en["model.controlled_deployments_reduce_release_risk_without_adding_manual_bottlenecks"],
        options: [en["model.manual_undocumented_deployments"], en["model.scripts_exist_but_differ_by_team"], en["model.automated_deployments_with_approval_and_rollback_steps"], en["model.standard_environments_and_tested_rollback_strategies"], en["model.progressive_delivery_with_measured_recovery_and_reliability"]],
        action: en["model.document_deployment_environments_approvals_and_rollback_automate_a_representative"], evidence: en["model.deployment_workflow_environment_gates_rollback_drill"] },
      { id: 'artifacts', title: en["model.how_are_build_artifacts_and_environments_managed"], why: en["model.traceable_artifacts_help_teams_reproduce_and_trust_releases"],
        options: [en["model.artifacts_and_environments_managed_ad_hoc"], en["model.shared_storage_and_manually_tracked_versions"], en["model.versioned_artifacts_and_documented_environment_setup"], en["model.infrastructure_as_code_and_controlled_artifact_promotion"], en["model.provenance_reproducibility_and_lifecycle_policy_enforced"]],
        action: en["model.standardize_versioned_artifacts_and_reproducible_environment_definitions"], evidence: en["model.registry_infrastructure_definitions_promotion_policy"] },
      { id: 'delivery-metrics', title: en["model.how_is_delivery_performance_understood"], why: en["model.baseline_metrics_are_needed_to_demonstrate_modernization_outcomes"],
        options: [en["model.no_delivery_baseline"], en["model.anecdotal_feedback_and_manual_reporting"], en["model.lead_time_frequency_failure_and_recovery_baselined"], en["model.metrics_reviewed_regularly_with_team_level_actions"], en["model.trends_guide_experiments_with_business_outcome_checks"]],
        action: en["model.baseline_delivery_flow_and_reliability_measures_without_using_them"], evidence: en["model.delivery_metrics_baseline_period_improvement_review"] },
      { id: 'integrations', title: en["model.how_well_are_platform_integrations_and_migration_dependencies_understood"], why: en["model.hidden_dependencies_can_make_a_straightforward_migration_complex"],
        options: [en["model.integrations_and_dependencies_unknown"], en["model.some_dependencies_known_by_individual_teams"], en["model.inventory_includes_boards_pipelines_packages_and_identity"], en["model.criticality_owners_and_migration_tests_documented"], en["model.dependencies_validated_with_rehearsals_and_rollback_plans"]],
        action: en["model.map_boards_pipelines_packages_identity_and_external_integrations_before"], evidence: en["model.integration_map_compatibility_findings_migration_rehearsal"] },
    ],
  },
  {
    id: 'experience', name: en["model.developer_experience"], short: en["model.developer_experience"], weight: 15,
    description: en["model.a_productive_collaborative_development_workflow_that_teams_can_actually"], color: '#ffb86b',
    questions: [
      { id: 'onboarding', title: en["model.how_predictable_is_developer_onboarding"], why: en["model.onboarding_friction_reveals_gaps_in_access_environments_and_documentation"],
        options: [en["model.setup_depends_on_individual_help"], en["model.team_specific_setup_notes_exist"], en["model.maintained_onboarding_checklist_and_environment_guide"], en["model.self_service_access_and_reproducible_development_setup"], en["model.time_to_first_change_measured_and_systematically_reduced"]],
        action: en["model.create_a_maintained_onboarding_path_and_measure_time_to"], evidence: en["model.onboarding_guide_setup_scripts_developer_feedback"] },
      { id: 'collaboration', title: en["model.how_consistently_do_teams_collaborate_through_pull_requests"], why: en["model.review_quality_depends_on_shared_expectations_not_just_enabling"],
        options: [en["model.changes_often_bypass_peer_review"], en["model.reviews_used_inconsistently"], en["model.pull_requests_owners_and_review_expectations_established"], en["model.small_changes_and_review_turnaround_actively_supported"], en["model.review_quality_and_flow_continuously_improved"]],
        action: en["model.agree_on_code_ownership_pull_request_templates_review_expectations"], evidence: en["model.pull_requests_codeowners_review_working_agreement"] },
      { id: 'planning', title: en["model.how_traceable_is_work_from_planning_to_delivery"], why: en["model.teams_need_a_coherent_view_across_issues_boards_code"],
        options: [en["model.work_tracked_in_disconnected_places"], en["model.team_boards_exist_without_consistent_links_to_code"], en["model.issues_and_changes_linked_with_clear_acceptance_criteria"], en["model.cross_team_dependencies_and_release_views_maintained"], en["model.outcome_feedback_shapes_prioritization_and_work_in_progress"]],
        action: en["model.connect_work_items_to_changes_and_releases_including_any"], evidence: en["model.project_boards_linked_issues_and_prs_release_notes"] },
      { id: 'templates', title: en["model.how_easily_can_teams_reuse_proven_engineering_patterns"], why: en["model.supported_paved_roads_reduce_duplication_without_removing_team_autonomy"],
        options: [en["model.each_team_starts_from_scratch"], en["model.informal_snippets_shared_between_developers"], en["model.maintained_repository_templates_and_guidance"], en["model.supported_self_service_templates_and_inner_source_reuse"], en["model.adoption_and_feedback_inform_a_maintained_platform_offering"]],
        action: en["model.publish_supported_starter_repositories_with_tests_ownership_and_contribution"], evidence: en["model.templates_shared_components_contribution_model"] },
      { id: 'feedback', title: en["model.how_is_developer_friction_identified_and_addressed"], why: en["model.developer_feedback_is_necessary_to_distinguish_tool_adoption_from"],
        options: [en["model.no_structured_developer_feedback"], en["model.occasional_informal_feedback"], en["model.regular_surveys_and_a_visible_improvement_backlog"], en["model.feedback_combined_with_workflow_and_adoption_signals"], en["model.closed_loop_improvements_measured_with_affected_teams"]],
        action: en["model.establish_a_lightweight_developer_feedback_baseline_and_prioritize_the"], evidence: en["model.survey_friction_backlog_completed_improvements"] },
    ],
  },
  {
    id: 'copilot', name: en["model.copilot_responsible_ai"], short: en["ui.copilot"], weight: 20,
    description: en["model.governed_ai_adoption_practical_enablement_and_evidence_of_developer"], color: '#d399ff',
    questions: [
      { id: 'ai-policy', title: en["model.how_is_ai_assisted_development_governed"], why: en["model.a_rollout_needs_approved_usage_boundaries_and_human_accountability"],
        options: [en["model.no_approved_ai_policy"], en["model.informal_guidance_or_isolated_approvals"], en["model.documented_acceptable_use_privacy_and_review_requirements"], en["model.centrally_managed_policies_and_approved_tool_configuration"], en["model.policy_effectiveness_reviewed_with_security_and_legal"]], critical: true,
        action: en["model.agree_on_ai_acceptable_use_data_handling_approved_tools"], evidence: en["model.ai_policy_security_legal_approval_organization_settings"] },
      { id: 'ai-rollout', title: en["model.how_far_has_the_copilot_rollout_progressed"], why: en["model.a_deliberate_pilot_builds_evidence_before_expanding_access"],
        options: [en["ui.not_deployed"], en["model.small_informal_trial"], en["model.sponsored_pilot_with_cohorts_and_success_criteria"], en["model.phased_rollout_with_license_and_usage_governance"], en["model.sustained_adoption_with_ongoing_cohort_improvements"]],
        action: en["model.launch_a_sponsored_copilot_pilot_with_named_cohorts_baseline"], evidence: en["model.pilot_charter_seat_assignments_rollout_plan"] },
      { id: 'ai-skills', title: en["model.how_prepared_are_developers_to_use_copilot_effectively"], why: en["model.value_depends_on_task_selection_context_verification_and_new"],
        options: [en["model.no_enablement"], en["model.introductory_demos_only"], en["model.hands_on_training_on_relevant_tasks_and_verification"], en["model.role_specific_learning_champions_and_office_hours"], en["model.ongoing_enablement_informed_by_usage_and_feedback"]],
        action: en["model.run_hands_on_copilot_workshops_using_real_workflows_testing"], evidence: en["model.training_material_attendance_champion_network"] },
      { id: 'ai-workflows', title: en["model.how_is_ai_assistance_integrated_into_engineering_workflows"], why: en["model.workflow_adoption_is_more_meaningful_than_access_to_a"],
        options: [en["model.no_defined_use_cases"], en["model.occasional_completion_or_chat_usage"], en["model.documented_use_cases_for_code_tests_and_explanation"], en["model.approved_ide_and_repository_workflows_with_review_gates"], en["model.workflow_experiments_evaluated_for_quality_and_usefulness"]],
        action: en["model.prioritize_repeatable_ai_use_cases_and_retain_tests_reviews"], evidence: en["model.use_case_catalog_working_examples_review_guidance"] },
      { id: 'ai-value', title: en["model.how_is_copilot_value_evaluated"], why: en["model.usage_alone_does_not_demonstrate_productivity_quality_or_business"],
        options: [en["model.no_baseline_or_success_measures"], en["model.anecdotes_or_assigned_seat_counts_only"], en["model.usage_satisfaction_and_workflow_baselines_collected"], en["model.cohorts_reviewed_against_quality_and_delivery_outcomes"], en["model.evidence_guides_expansion_without_individual_surveillance"]],
        action: en["model.baseline_adoption_satisfaction_quality_and_delivery_outcomes_review_pilot"], evidence: en["model.baseline_cohort_report_adoption_and_quality_measures"] },
    ],
  },
  {
    id: 'change', name: en["model.strategy_change_readiness"], short: en["model.change_readiness"], weight: 10,
    description: en["model.the_sponsorship_capacity_and_operating_model_to_make_modernization"], color: '#76c893',
    questions: [
      { id: 'sponsor', title: en["model.how_strong_is_sponsorship_for_modernization"], why: en["model.platform_change_needs_a_decision_maker_and_a_measurable"],
        options: [en["model.no_sponsor_or_shared_goal"], en["model.interest_exists_but_no_accountable_sponsor"], en["model.named_sponsor_and_agreed_business_objectives"], en["model.funded_program_with_decision_cadence_and_owners"], en["model.outcomes_reviewed_and_investment_adapted"]],
        action: en["model.name_a_sponsor_and_agree_on_measurable_modernization_outcomes"], evidence: en["model.sponsor_charter_agreed_outcomes"] },
      { id: 'capacity', title: en["model.is_there_capacity_to_implement_and_operate_the_changes"], why: en["model.readiness_includes_people_and_time_not_only_technical_compatibility"],
        options: [en["model.no_identified_capacity"], en["model.work_expected_to_happen_alongside_existing_duties"], en["model.named_implementation_and_operational_owners"], en["model.allocated_capacity_skills_plan_and_support_model"], en["model.capacity_and_support_effectiveness_reviewed_continuously"]],
        action: en["model.allocate_implementation_capacity_and_define_the_platform_support_and"], evidence: en["model.team_allocation_responsibilities_support_model"] },
      { id: 'constraints', title: en["model.how_well_are_regulatory_residency_and_hosting_constraints_understood"], why: en["model.some_requirements_determine_which_target_platforms_are_viable"],
        options: [en["model.constraints_unknown"], en["model.assumptions_exist_but_are_not_validated"], en["model.documented_requirements_reviewed_by_relevant_stakeholders"], en["model.requirements_mapped_to_target_architecture_and_controls"], en["model.controls_and_exceptions_validated_with_recurring_evidence"]],
        action: en["model.validate_regulatory_residency_network_and_hosting_constraints_before_committing"], evidence: en["model.requirements_register_architecture_review_approvals"] },
      { id: 'adoption', title: en["model.how_will_teams_be_supported_through_the_change"], why: en["model.migration_completion_is_not_the_same_as_adoption"],
        options: [en["model.no_communication_or_adoption_plan"], en["model.launch_communication_only"], en["model.team_engagement_training_and_support_plan"], en["model.champions_and_phased_adoption_with_feedback_channels"], en["model.adoption_barriers_measured_and_addressed_continuously"]],
        action: en["model.create_a_stakeholder_communication_plan_champion_network_and_feedback"], evidence: en["model.communication_plan_training_schedule_support_channels"] },
      { id: 'roadmap', title: en["model.how_actionable_is_the_modernization_roadmap"], why: en["model.an_achievable_sequence_connects_dependencies_value_and_readiness"],
        options: [en["model.no_roadmap"], en["model.unprioritized_list_of_ideas"], en["model.prioritized_milestones_with_owners_and_dependencies"], en["model.pilot_migration_waves_rollback_and_success_criteria_agreed"], en["model.roadmap_evolves_from_measured_outcomes_and_risks"]],
        action: en["model.agree_on_a_30_60_90_day_plan_with"], evidence: en["model.roadmap_pilot_plan_decision_log"] },
    ],
  },
]
export const allQuestions = pillars.flatMap(p => p.questions)
export const maturityLevels = [en["ui.initial"], en["ui.developing"], en["ui.defined"], en["ui.managed"], en["ui.optimizing"]] as const
export const ratingNames = [en["model.not_established"], en["model.ad_hoc"], en["ui.defined"], en["ui.managed"], en["ui.optimizing"]]
export function isAnswered(a: Assessment, id: string) {
  const answer = a.answers[id]
  return answer !== undefined && answer.value !== null
}
export function isProfileComplete(a: Assessment) {
  return Boolean(a.customer.trim() && a.platform && (a.platform !== 'other' || a.otherPlatform.trim()))
}
export function newAssessment(): Assessment {
  return {
    id: crypto.randomUUID(), customer: '', facilitator: '', date: new Date().toISOString().slice(0, 10),
    platform: '', otherPlatform: '', hosting: 'undecided', githubPlan: 'undecided', developers: 0,
    answers: {}, sample: false, updatedAt: new Date().toISOString(),
  }
}
export function exampleAssessment(): Assessment {
  const assessment = newAssessment()
  const ratings: Rating[] = [3, 3, 2, 2, 2, 2, 2, 3, 1, 2, 3, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1, 2, 1, 3, 2, 3, 2, 2]
  return {
    ...assessment, customer: en["model.northstar_engineering"], facilitator: en["model.sample_facilitator"], platform: 'mixed',
    hosting: 'cloud', githubPlan: 'enterprise', developers: 240, sample: true,
    answers: Object.fromEntries(allQuestions.map((q, i) => [q.id, {
        value: ratings[i], evidence: en["model.illustrative_response_only_replace_with_evidence_gathered_during_a"],
      }])),
  }
}
