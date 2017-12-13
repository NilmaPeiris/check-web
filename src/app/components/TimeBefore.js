import React from 'react';
import { injectIntl, intlShape } from 'react-intl';

const TimeBefore = (props) => {
  const date = new Date(props.date);
  const datetimeLabel = new Date(+date - (date.getTimezoneOffset() * 60 * 1000)).toISOString().split('.')[0].replace('T', ' ').slice(0, -3);

  return (
    <time style={props.style} title={datetimeLabel}>
      {props.intl.formatRelative(date)}
    </time>
  );
};

TimeBefore.propTypes = {
  intl: intlShape.isRequired,
};

export default injectIntl(TimeBefore);
