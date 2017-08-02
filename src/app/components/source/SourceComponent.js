import React, { Component } from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';
import {
  FormattedMessage,
  FormattedHTMLMessage,
  FormattedDate,
  defineMessages,
  injectIntl,
  intlShape,
} from 'react-intl';
import AutoComplete from 'material-ui/AutoComplete';
import TextField from 'material-ui/TextField';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';
import { Card, CardActions, CardHeader, CardText } from 'material-ui/Card';
import IconButton from 'material-ui/IconButton';
import { Tabs, Tab } from 'material-ui/Tabs';
import Popover from 'material-ui/Popover';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import MdCancel from 'react-icons/lib/md/cancel';
import MDEdit from 'react-icons/lib/md/edit';
import AccountCard from './AccountCard';
import SourceTags from './SourceTags';
import Annotations from '../annotations/Annotations';
import PageTitle from '../PageTitle';
import Medias from '../media/Medias';
import MediaUtil from '../media/MediaUtil';
import Message from '../Message';
import Can from '../Can';
import CheckContext from '../../CheckContext';
import ContentColumn from '../layout/ContentColumn';
import ParsedText from '../ParsedText';
import UploadImage from '../UploadImage';
import { truncateLength } from '../../helpers';
import globalStrings from '../../globalStrings';
import CreateDynamicMutation from '../../relay/CreateDynamicMutation';
import UpdateDynamicMutation from '../../relay/UpdateDynamicMutation';
import CreateTagMutation from '../../relay/CreateTagMutation';
import DeleteTagMutation from '../../relay/DeleteTagMutation';
import UpdateSourceMutation from '../../relay/UpdateSourceMutation';

const messages = defineMessages({
  addInfo: {
    id: 'sourceComponent.addInfo',
    defaultMessage: 'Add Info',
  },
  editError: {
    id: 'sourceComponent.editError',
    defaultMessage: 'Sorry, could not edit the source',
  },
  editSuccess: {
    id: 'sourceComponent.editSuccess',
    defaultMessage: 'Source information updated successfully!',
  },
  mergeSource: {
    id: 'sourceComponent.mergeSource',
    defaultMessage: 'Merge Source',
  },
  sourceName: {
    id: 'sourceComponent.sourceName',
    defaultMessage: 'Source name',
  },
  sourceBio: {
    id: 'sourceComponent.sourceBio',
    defaultMessage: 'Source bio',
  },
  contactNote: {
    id: 'sourceComponent.contactNote',
    defaultMessage: 'Contact note',
  },
  phone: {
    id: 'sourceComponent.phone',
    defaultMessage: 'Phone',
  },
  organization: {
    id: 'sourceComponent.organization',
    defaultMessage: 'Organization',
  },
  location: {
    id: 'sourceComponent.location',
    defaultMessage: 'Location',
  },
});

class SourceComponent extends Component {

  constructor(props) {
    super(props);

    this.state = {
      message: null,
      isEditing: false,
      metadata: this.getMetadataFields(),
      submitDisabled: false,
      showTab: 'media',
    };
  }

  componentDidMount() {
    this.setContextSource();
  }

  componentDidUpdate() {
    this.setContextSource();
  }

  getContext() {
    const context = new CheckContext(this).getContextStore();
    return context;
  }

  setContextSource() {
    const store = this.getContext();
    const { team, project_id } = this.props.source;

    if (!store.team || store.team.slug !== team.slug) {
      context.setContextStore({ team });
    }

    if (!store.project || store.project.dbid !== project_id) {
      context.setContextStore({ project: { dbid: project_id } });
    }
  }

  isProjectSource() {
    return !!this.props.source.source;
  }

  getSource() {
    const { source } = this.isProjectSource() ? this.props.source : this.props;
    return source;
  }

  getMetadataAnnotation() {
    const source = this.getSource();
    const metadata = source.annotations.edges.find(item => item.node && item.node.annotation_type === 'metadata');
    return metadata && metadata.node ? metadata.node : null;
  }

  getMetadataFields() {
    const metadata = this.getMetadataAnnotation();
    const content = metadata && metadata.content ? JSON.parse(metadata.content) : [];
    return content[0] && content[0].value ? JSON.parse(content[0].value) : null;
  }

  handleAddInfoMenu = (event) => {
    event.preventDefault();

    this.setState({
      menuOpen: true,
      anchorEl: event.currentTarget,
    });
  };

  handleAddMetadataField = (type) => {
    const metadata = this.state.metadata ? Object.assign({}, this.state.metadata) : {};
    if (!metadata[type]) { metadata[type] = ''; }
    this.setState({ metadata, menuOpen: false });
  };

  handleAddTags = () => {
    this.setState({ addingTags: true });
  };

  handleRequestClose() {
    this.setState({
      menuOpen: false,
    });
  }

  handleEditProfileImg = () => {
    this.setState({ editProfileImg: true });
  };

  handleTabChange = (value) => {
    this.setState({
      showTab: value,
    });
  };

  handleEnterEditMode(e) {
    this.setState({ isEditing: true });
    e.preventDefault();
  }

  handleLeaveEditMode() {
    this.setState({ isEditing: false, editProfileImg: false, metadata: this.getMetadataFields() });
    this.onClear();
  }

  handleChangeField(type, e) {
    const metadata = this.state.metadata ? Object.assign({}, this.state.metadata) : {};
    metadata[type] = e.target.value;
    this.setState({ metadata });
  }

  handleRemoveField(type) {
    const metadata = this.state.metadata ? Object.assign({}, this.state.metadata) : {};
    delete metadata[type];
    this.setState({ metadata });
  }

  handleSubmit(e) {
    if (!this.state.submitDisabled) {
      this.updateSource();
      this.updateMetadata();
    }
    e.preventDefault();
  }

  handleSelectTag = (chosenRequest, index) => {
    this.createTag(chosenRequest);
  };

  fail = (transaction) => {
    const error = transaction.getError();
    let message = error.source;
    try {
      const json = JSON.parse(error.source);
      if (json.error) {
        message = json.error;
      }
    } catch (e) { }
    this.setState({ message, submitDisabled: false });
  };

  success = (response) => {
    this.setState({ message: null, isEditing: false, submitDisabled: false });
  };

  createDynamicAnnotation(that, annotated, annotated_id, annotated_type, value) {
    const onFailure = (transaction) => { that.fail(transaction); };
    const onSuccess = (response) => { that.success(); };
    const annotator = that.getContext().currentUser;
    const fields = {};
    fields.metadata_value = JSON.stringify(value);

    Relay.Store.commitUpdate(
      new CreateDynamicMutation({
        parent_type: annotated_type.replace(/([a-z])([A-Z])/, '$1_$2').toLowerCase(),
        annotator,
        annotated,
        context: that.getContext(),
        annotation: {
          fields,
          annotation_type: 'metadata',
          annotated_type,
          annotated_id,
        },
      }),
      { onSuccess, onFailure },
    );

    this.setState({ submitDisabled: true });
  }

  updateDynamicAnnotation(that, annotated, annotation_id, value) {
    const onFailure = (transaction) => { that.fail(transaction); };
    const onSuccess = (response) => { that.success(); };
    const fields = {};
    fields.metadata_value = JSON.stringify(value);

    Relay.Store.commitUpdate(
      new UpdateDynamicMutation({
        annotated,
        dynamic: {
          id: annotation_id,
          fields,
        },
      }),
      { onSuccess, onFailure },
    );

    this.setState({ submitDisabled: true });
  }

  createTag(tagString) {
    const that = this;
    const { source } = this.props;
    const context = new CheckContext(this).getContextStore();

    const onFailure = (transaction) => { that.fail(transaction); };
    const onSuccess = (response) => {
      const field = document.forms['edit-source-form'].addTag;
      field.blur();
      field.value = '';
      that.setState({ message: null });
    };

    Relay.Store.commitUpdate(
      new CreateTagMutation({
        annotated: source,
        annotator: context.currentUser,
        parent_type: 'project_source',
        context,
        annotation: {
          tag: tagString.trim(),
          annotated_type: 'ProjectSource',
          annotated_id: source.dbid,
        },
      }),
      { onSuccess, onFailure },
    );
  }

  deleteTag(tagId) {
    const that = this;
    const { source } = that.props;
    const onFailure = (transaction) => { that.fail(transaction); };
    const onSuccess = (response) => {};

    Relay.Store.commitUpdate(
      new DeleteTagMutation({
        annotated: source,
        parent_type: 'project_source',
        id: tagId,
      }),
      { onSuccess, onFailure },
    );
  }

  updateMetadata() {
    const source = this.getSource();
    const metadata = this.state.metadata ? Object.assign({}, this.state.metadata) : {};
    const metadataAnnotation = this.getMetadataAnnotation();

    if (metadataAnnotation) {
      this.updateDynamicAnnotation(this, source, metadataAnnotation.id, metadata);
    } else {
      this.createDynamicAnnotation(this, source, source.dbid, 'Source', metadata);
    }
  }

  updateSource() {
    const that = this;
    const source = this.getSource();
    const onFailure = (transaction) => { that.fail(transaction); };
    const onSuccess = (response) => { that.success(); };
    const form = document.forms['edit-source-form'];

    Relay.Store.commitUpdate(
      new UpdateSourceMutation({
        source: {
          id: source.id,
          name: form.name.value,
          image: form.image,
          description: form.description.value,
        },
      }),
      { onSuccess, onFailure },
    );
  }

  labelForType(type) {
    switch (type) {
      case 'contact_note':
        return this.props.intl.formatMessage(messages.contactNote);
      case 'phone':
        return this.props.intl.formatMessage(messages.phone);
      case 'organization':
        return this.props.intl.formatMessage(messages.organization);
      case 'location':
        return this.props.intl.formatMessage(messages.location);
    }
  }

  onImage(file) {
    document.forms['edit-source-form'].image = file;
    this.setState({ image: file });
  }

  onClear = () => {
    document.forms['edit-source-form'].image = null;
    this.setState({ image: null });
  };

  onImageError(file, message) {
    this.setState({ message, image: null });
  }

  renderMetadataView() {
    const metadata = this.state.metadata;

    const renderMetadataFieldView = (type) => {
      return metadata[type] ?
        <span className={`source__metadata-${type}`}>
          {this.labelForType(type) + ': ' + metadata[type]} <br />
        </span> : null;
    };

    if (metadata) {
      return (<div className="source__metadata">
          { renderMetadataFieldView('contact_note') }
          { renderMetadataFieldView('phone') }
          { renderMetadataFieldView('organization') }
          { renderMetadataFieldView('location') }
        </div>
      );
    }
  }

  renderMetadataEdit() {
    const metadata = this.state.metadata;

    const renderMetadataFieldEdit = (type) => {
      return metadata.hasOwnProperty(type) ? <div className={`source__metadata-${type}-input`}>
        <TextField
          defaultValue={metadata[type]}
          floatingLabelText={this.labelForType(type)}
          style={{ width: '85%' }}
          onChange={this.handleChangeField.bind(this, type)}
        />
        <MdCancel className="create-task__remove-option-button create-task__md-icon" onClick={this.handleRemoveField.bind(this, type)}/>
      </div> : null;
    };

    if (metadata) {
      return (<div className="source__metadata">
          { renderMetadataFieldEdit('contact_note') }
          { renderMetadataFieldEdit('phone') }
          { renderMetadataFieldEdit('organization') }
          { renderMetadataFieldEdit('location') }
        </div>
      );
    }
  }

  renderTagsView() {
    const tags = this.props.source.tags.edges;
    return <SourceTags tags={tags} />;
  }

  renderTagsEdit() {
    const tags = this.props.source.tags.edges;
    const tagLabels = tags.map(tag => tag.node.tag);
    const suggestedTags = (this.props.source.team && this.props.source.team.get_suggested_tags) ? this.props.source.team.get_suggested_tags.split(',') : [];
    const availableTags = suggestedTags.filter(suggested => !tagLabels.includes(suggested));

    return <div>
      { this.state.addingTags || tags ?
        <AutoComplete
          name="addTag" id="addTag"
          floatingLabelText={this.props.intl.formatMessage(globalStrings.tags)}
          dataSource={availableTags}
          onNewRequest={this.handleSelectTag}
          fullWidth
        /> : null
      }
      <SourceTags tags={tags} onDelete={this.deleteTag.bind(this)} />
    </div>;
  }

  renderSourceView(source, isProjectSource) {
    return (
        <div className="source__profile-content">
          <section className="layout-two-column">
            <div className="column-secondary">
              <div
                className="source__avatar"
                style={{ backgroundImage: `url(${source.image})` }}
                />
            </div>

            <div className="column-primary">
              <div className="source__primary-info">
                <h1 className="source__name">
                  {source.name}
                </h1>
                <div className="source__description">
                  <p className="source__description-text">
                    <ParsedText text={truncateLength(source.description, 600)} />
                  </p>
                </div>
              </div>

              { isProjectSource ?
                <div className="source__contact-info">
                  <FormattedHTMLMessage
                    id="sourceComponent.dateAdded" defaultMessage="Added {date} &bull; Source of {number} links"
                    values={{
                      date: this.props.intl.formatDate(MediaUtil.createdAt({ published: source.created_at }), { year: 'numeric', month: 'short', day: '2-digit' }),
                      number: source.medias.edges.length || '0',
                    }}
                    />
                </div> : null
              }

              { this.renderTagsView() }
              { this.renderMetadataView() }

            </div>
          </section>
          { isProjectSource ?
            <Tabs value={this.state.showTab} onChange={this.handleTabChange}>
              <Tab
                label={<FormattedMessage id="sourceComponent.medias" defaultMessage="Media" />}
                value="media"
                className="source__tab-button-media"
              />
              <Tab
                label={<FormattedMessage id="sourceComponent.notes" defaultMessage="Notes" />}
                className="source__tab-button-notes"
                value="annotation"
              />
              <Tab
                label={<FormattedMessage id="sourceComponent.network" defaultMessage="Networks" />}
                value="account"
                className="source__tab-button-account"
              />
            </Tabs> : <CardActions />
          }
        </div>
    );
  }

  renderSourceEdit(source) {
    const avatarPreview = this.state.image && this.state.image.preview;

    return (
      <div className="source__profile-content">
        <section className="layout-two-column">
          <div className="column-secondary">
            <div
              className="source__avatar"
              style={{ backgroundImage: `url(${ avatarPreview || source.image})` }}
              />
            { !this.state.editProfileImg ?
              <div className="source__edit-avatar-button">
                <FlatButton
                  label={this.props.intl.formatMessage(globalStrings.edit)}
                  onClick={this.handleEditProfileImg.bind(this)}
                  primary
                  />
              </div> : null
            }
          </div>

          <div className="column-primary">
            <form onSubmit={this.handleSubmit.bind(this)} name="edit-source-form">
              { this.state.editProfileImg ?
                <UploadImage onImage={this.onImage.bind(this)} onClear={this.onClear} onError={this.onImageError.bind(this)} noPreview /> : null
              }
              <TextField
                className="source__name-input"
                name="name"
                id="source__name-container"
                defaultValue={source.name}
                floatingLabelText={this.props.intl.formatMessage(messages.sourceName)}
                fullWidth
              />
              <TextField
                className="source__bio-input"
                name="description"
                id="source__bio-container"
                defaultValue={source.description}
                floatingLabelText={this.props.intl.formatMessage(messages.sourceBio)}
                multiLine={true}
                rowsMax={4}
                fullWidth
              />

              { this.renderTagsEdit() }
              { this.renderMetadataEdit() }
            </form>

            <div className="source__edit-buttons">
              <div className="source__edit-buttons-add-merge">
                <FlatButton className="source__edit-addinfo-button"
                  primary
                  onClick={this.handleAddInfoMenu}
                  label={this.props.intl.formatMessage(messages.addInfo)} />
                <Popover open={this.state.menuOpen} anchorEl={this.state.anchorEl} anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }} targetOrigin={{ horizontal: 'left', vertical: 'top' }} onRequestClose={this.handleRequestClose.bind(this)}>
                  <Menu>
                    <MenuItem className="source__add-contact-note" onClick={this.handleAddMetadataField.bind(this, 'contact_note')} primaryText={this.props.intl.formatMessage(messages.contactNote)} />
                    <MenuItem className="source__add-phone" onClick={this.handleAddMetadataField.bind(this, 'phone')} primaryText={this.props.intl.formatMessage(messages.phone)} />
                    <MenuItem className="source__add-organization" onClick={this.handleAddMetadataField.bind(this, 'organization')} primaryText={this.props.intl.formatMessage(messages.organization)} />
                    <MenuItem className="source__add-location" onClick={this.handleAddMetadataField.bind(this, 'location')} primaryText={this.props.intl.formatMessage(messages.location)} />
                    <MenuItem className="source__add-tags" onClick={this.handleAddTags.bind(this)} primaryText={this.props.intl.formatMessage(globalStrings.tags)} />
                  </Menu>
                </Popover>
              </div>

              <div className="source__edit-buttons-cancel-save">
                <FlatButton className="source__edit-cancel-button"
                  onClick={this.handleLeaveEditMode.bind(this)}
                  label={this.props.intl.formatMessage(globalStrings.cancel)} />
                <RaisedButton className="source__edit-save-button"
                  primary
                  onClick={this.handleSubmit.bind(this)}
                  label={this.props.intl.formatMessage(globalStrings.save)} />
              </div>
              <div className="source__edit-buttons-clear" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  render() {
    const isProjectSource = this.isProjectSource();
    const source = this.getSource();
    const isEditing = this.state.isEditing;

    return (
      <PageTitle prefix={source.name} skipTeam={false} team={this.props.source.team}>
        <div className="source" data-id={source.dbid} data-user-id={source.user_id}>
          <Card className="source__profile source__profile--editing">
            <ContentColumn>
              <Message message={this.state.message} />
              { isEditing ?
                  this.renderSourceEdit(source, isProjectSource) :
                  this.renderSourceView(source, isProjectSource)
              }
            </ContentColumn>
            { !isEditing ?
              <section className="layout-fab-container">
                <Can
                  permissions={source.permissions}
                  permission="update Source"
                  >
                  <IconButton
                    className="source__edit-button"
                    tooltip={
                      <FormattedMessage
                        id="sourceComponent.editButton"
                        defaultMessage="Edit profile"
                      />
                    }
                    tooltipPosition="top-center"
                    onTouchTap={this.handleEnterEditMode.bind(this)}
                    >
                    <MDEdit />
                  </IconButton>
                </Can>
              </section> : null
            }
          </Card>

          { !isEditing ?
            <div>
              { this.state.showTab === 'annotation' ? <Annotations annotations={source.annotations.edges.slice().reverse()} annotated={source} annotatedType="Source" /> : null }
              <ContentColumn>
                { this.state.showTab === 'media' ? <Medias medias={source.medias.edges} /> : null }
                { this.state.showTab === 'account' ? source.accounts.edges.map(account => <AccountCard key={account.node.id} account={account.node} />) : null }
              </ContentColumn>
            </div> : null
          }
        </div>
      </PageTitle>
    );
  }
}

SourceComponent.propTypes = {
  intl: intlShape.isRequired,
  source: PropTypes.object,
};

SourceComponent.contextTypes = {
  store: React.PropTypes.object,
};

export default injectIntl(SourceComponent);
