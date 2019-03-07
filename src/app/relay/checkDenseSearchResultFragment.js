import Relay from 'react-relay/classic';

const checkSearchResultFragment = Relay.QL`
  fragment on CheckSearch {
    id,
    pusher_channel,
    medias(first: $pageSize) {
      edges {
        node {
          id,
          dbid,
          embed,
          relationships { sources_count, targets_count },
          verification_statuses,
          translation_statuses,
          project_id,
          permissions,
          deadline: field_value(annotation_type_field_name: "verification_status:deadline"),
          last_status,
          team {
            slug
            search_id,
            get_status_target_turnaround
          }
        }
      }
    },
    number_of_results
  }
`;

module.exports = checkSearchResultFragment;
