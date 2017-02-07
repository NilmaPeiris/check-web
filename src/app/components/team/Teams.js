import React, { Component, PropTypes } from 'react';
import { FormattedMessage } from 'react-intl';
import SwitchTeams from './SwitchTeams.js';
import DocumentTitle from 'react-document-title';
import { pageTitle } from '../../helpers';
import ContentColumn from '../layout/ContentColumn';
import Heading from '../layout/Heading';

class Teams extends Component {
  render() {
    return (
      <DocumentTitle title={pageTitle('Teams', true)}>
        <section className="teams">
          <ContentColumn>
            <Heading><FormattedMessage id="teams.yourTeams" defaultMessage="Your Teams" /></Heading>
            <SwitchTeams />
          </ContentColumn>
        </section>
      </DocumentTitle>
    );
  }
}

export default Teams;
