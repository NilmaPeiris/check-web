import React, { Component } from 'react';
import Relay from 'react-relay';
import { defineMessages, injectIntl, intlShape, FormattedMessage } from 'react-intl';
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import TextField from 'material-ui/TextField';
import TeamRoute from '../../relay/TeamRoute';
import UpdateTeamMutation from '../../relay/UpdateTeamMutation';
import Can from '../Can';
import CheckContext from '../../CheckContext';
import Search from '../Search';

const messages = defineMessages({
  title: {
    id: 'trash.title',
    defaultMessage: 'Trash',
  },
  refresh: {
    id: 'trash.refresh',
    defaultMessage: 'Refresh now',
  },
});

class TrashComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      emptyTrashDisabled: false,
      refreshedAt: 0,
      open: false,
      confirmationError: false,
    };
  }

  componentDidMount() {
    this.setContextTeam();
  }

  componentDidUpdate() {
    this.setContextTeam();
  }

  getContext() {
    const context = new CheckContext(this);
    return context;
  }

  setContextTeam() {
    const context = this.getContext();
    const currentContext = this.currentContext();

    if (!currentContext.team || currentContext.team.slug !== this.props.team.slug) {
      context.setContextStore({ team: this.props.team });
    }
  }

  currentContext() {
    return this.getContext().getContextStore();
  }

  handleMessage(message) {
    this.context.setMessage(message);
  }

  handleRefresh() {
    this.setState({ refreshedAt: new Date().getTime() });
  }

  handleClose() {
    this.setState({ open: false });
  }

  handleOpen() {
    this.setState({ open: true });
  }

  handleConfirmEmptyTrash() {
    const confirmValue = document.getElementById('trash__confirm').value;
    if (confirmValue && confirmValue.toUpperCase() === 'CONFIRM') {
      this.setState({ confirmationError: false });
      this.handleClose();
      this.handleEmptyTrash();
    }
    else {
      this.setState({ confirmationError: true });
    }
  }

  handleEmptyTrash() {
    const message = <FormattedMessage
                      id="trash.emptyInProgress"
                      defaultMessage={'Empty trash operation is in progress. Please check back later. {refresh}'}
                      values={{
                        refresh: <span onClick={this.handleRefresh.bind(this)} style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                                   {this.props.intl.formatMessage(messages.refresh)}
                                 </span>
                      }}
                    />;

    if (this.state.emptyTrashDisabled) {
      this.handleMessage(message);
    }
    else {
      this.setState({ emptyTrashDisabled: true });

      const onFailure = (transaction) => {
        const transactionError = transaction.getError();
        transactionError.json
          ? transactionError.json().then(this.handleMessage)
          : this.handleMessage(JSON.stringify(transactionError));
        this.setState({ emptyTrashDisabled: false });
      };

      const onSuccess = (response) => {
        this.handleMessage(message);
      };

      Relay.Store.commitUpdate(
        new UpdateTeamMutation({
          empty_trash: 1,
          search_id: this.props.team.search_id,
          id: this.props.team.id,
        }),
        { onSuccess, onFailure },
      );
    }
  }

  render() {
    const team = this.props.team;

    let query = this.props.params.query || '{}';
    query = JSON.parse(query);
    query.archived = 1;
    query = JSON.stringify(query);

    const title = this.props.intl.formatMessage(messages.title);

    const actions = [
      <FlatButton label={<FormattedMessage id="trash.cancel" defaultMessage="Cancel" />} 
                  primary={true} 
                  onClick={this.handleClose.bind(this)} 
      />,
      <RaisedButton label={<FormattedMessage id="trash.deleteAll" defaultMessage="Delete all" />} 
                    primary={true} 
                    onClick={this.handleConfirmEmptyTrash.bind(this)} 
      />,
    ];

    return (
      <div className="trash">
        <Dialog actions={actions} modal={false} open={this.state.open} onRequestClose={this.handleClose.bind(this)}>
          <h2><FormattedMessage id="trash.emptyTrash" defaultMessage="Empty trash" /></h2>
          <p><FormattedMessage id="trash.emptyTrashConfirmationText" defaultMessage={'Are you sure? This will permanently delete {itemsCount, plural, =0 {0 items} one {1 item} other {# items}} and {notesCount, plural, =0 {0 annotations} one {1 annotation} other {# annotations}}. Type "confirm" if you want to proceed.'} values={{ itemsCount: team.trash_size.project_media.toString(), notesCount: team.trash_size.annotation.toString() }} /></p>
          <TextField id="trash__confirm"
                     fullWidth={true}
                     errorText={this.state.confirmationError ? 
                                <FormattedMessage id="trash.confirmationError" defaultMessage="Did not match" /> : 
                                null
                               }  
                     hintText={<FormattedMessage id="trash.typeHere" defaultMessage="Type here" />} 
          />
        </Dialog>

        <Search title={title} team={team.slug} query={query} fields={['status', 'sort', 'tags']} addons={
          <Can permissions={team.permissions} permission="update Team">
            <RaisedButton label={<FormattedMessage id="trash.emptyTrash" defaultMessage="Empty trash" />}
                          className="trash__empty-trash-button"
                          primary={true}
                          onClick={this.handleOpen.bind(this)}
                          disabled={this.state.emptyTrashDisabled}
            />
          </Can>
        } />
      </div>
    );
  }
}

TrashComponent.contextTypes = {
  store: React.PropTypes.object,
  setMessage: React.PropTypes.func,
};

TrashComponent.propTypes = {
  intl: intlShape.isRequired,
};

const TrashContainer = Relay.createContainer(TrashComponent, {
  fragments: {
    team: () => Relay.QL`
      fragment on Team {
        id
        dbid
        slug
        permissions
        trash_size
        search_id
      }
    `
  }
});

class Trash extends Component {
  render() {
    const slug = this.props.params.team || '';
    const route = new TeamRoute({ teamSlug: slug });
    return (<Relay.RootContainer Component={TrashContainer} forceFetch={true} route={route} renderFetched={data => <TrashContainer {...this.props} {...data} />}  />);
  }
}

export default injectIntl(Trash);