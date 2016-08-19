import React, { Component, PropTypes } from 'react';
import Relay from 'react-relay';

class CreateCommentMutation extends Relay.Mutation {
  getMutation() {
    return Relay.QL`mutation createComment {
      createComment
    }`;
  }

  getFatQuery() {
    var query = '';
    switch (this.props.parent_type) {
      case 'source':
        query = Relay.QL`fragment on CreateCommentPayload { commentEdge, source { annotations } }`;
        break;
      case 'media':
        query = Relay.QL`fragment on CreateCommentPayload { commentEdge, media { annotations } }`;
        break;
    }
    return query;
  }

  getVariables() {
    var comment = this.props.annotation;
    return { text: comment.text, annotated_id: comment.annotated_id + '', annotated_type: comment.annotated_type };
  }

  getConfigs() {
    return [{
      type: 'RANGE_ADD',
      parentName: this.props.parent_type,
      parentID: this.props.annotated.id,
      connectionName: 'annotations',
      edgeName: 'commentEdge',
      rangeBehaviors: {
        '': 'prepend'
      }
    }];
  }
}

export default CreateCommentMutation;
