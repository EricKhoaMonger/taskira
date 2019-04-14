import React, { Component } from 'react';
import { connect } from 'react-redux';

import { Subject, empty } from 'rxjs';
import {
  debounceTime,
  tap,
  switchMap,
} from 'rxjs/operators';

import {
  Grid,
  Paper,
  Button,
  Chip,
  Avatar,
  ClickAwayListener
} from '@material-ui/core';
import {
  ErrorOutlineRounded,
  ArrowDropUpRounded,
  ArrowDropDownRounded
} from '@material-ui/icons';
import { withStyles } from '@material-ui/core/styles';

import * as actions from '../../store/actions';
import Spinner from '../UI/Spinner/Spinner';
import Autocomplete from "../Form/Autocomplete/Autocomplete";

const styles = theme => ({
  root: {
    ...theme.typography.body1
  },
  header: {
    ...theme.typography.h4,
    paddingLeft: theme.spacing.unit * 2,
    paddingRight: theme.spacing.unit * 2,
    boxShadow: theme.shadows[0],
  },
  paper: {
    padding: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2
  },
  button: {
    fontSize: '10px',
    padding: theme.spacing.unit,
    marginLeft: theme.spacing.unit * 2
  },
  customChip: {
    fontSize: '12px',
    marginLeft: '20px'
  },
  prio: {
    ...theme.typography.subtitle2,
    marginLeft: theme.spacing.unit * (6 / 8),
    fontWeight: 'bold'
  },
  div: {
    marginBottom: theme.spacing.unit * 1.5
  },
  item2: {
    order: 3,
    [theme.breakpoints.up('lg')]: {
      order: 2,
    },
  },
  item3: {
    order: 2,
    [theme.breakpoints.up('lg')]: {
      order: 3,
    },
  },
  centeringChildren: {
    display: 'flex',
    alignItems: 'center'
  },
  assigneeField: {
    display: 'flex',
    alignItems: 'baseline'
  },
  cover: {
    position: 'relative',
    zIndex: 1,

    '&:before': {
      content: "''",
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      zIndex: 2,
      animation: '1s pulsing ease infinite'
    }
  },
  '@keyframes pulsing': {
    '0%': {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    '50%': {
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    '100%': {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
  }
})

export class Browse extends Component {
  inputSubject = new Subject();
  inputSource$ = null;

  state = {
    currentTicket: null,
    assigneeFieldObj: {
      name: 'assignee',
      type: 'email',
      placeholder: 'Assign to email',
    },
    suggestions: [],
    showList: false,
    showActions: false,
    searchingFor: '',
    textInput: '',
  };

  onHandleInputChanged = e => {
    this.inputSubject.next(e);
  }

  onSelectAssignee = email => {
    this.setState({ showList: false, textInput: email, showActions: true })
  }

  onAssign = () => {
    const token = localStorage.getItem('token');
    const dataObj = {
      userEmail: this.state.textInput,
      ticketId: this.props.selectedTicket._id,
      token
    }

    this.props.onAssignTicket(dataObj)
  }

  handleClickAway = e => {
    this.setState({ showList: false })
  }

  resetState = () => {
    this.setState({ suggestions: [], showList: false, searchingFor: '' });
    return empty();
  }

  fetchUsersByEmail = text => {
    const reqBody = {
      query: `
        query SearchUsers($text: String!) {
          searchUsers(text: $text) {
            name
            email
          }
        }`,
      variables: {
        text
      }
    }

    return fetch('http://localhost:5000/graphql', {
      method: 'POST',
      body: JSON.stringify(reqBody),
      headers: { 'Content-Type': 'application/json' }
    }).then(data => data.json())
  }

  componentDidMount = () => {
    const isLoggedIn = localStorage.getItem('userId') !== null;
    if (!isLoggedIn) {
      this.props.history.push('/login');
    }

    const currentTicketId = JSON.parse(localStorage.getItem('selectedTicket'))
    if (currentTicketId !== null) {
      this.props.onBrowseTicket(currentTicketId);
    }

    this.inputSource$ = this.inputSubject.pipe(
      tap(val => this.setState({ suggestions: [], showList: false, searchingFor: val, textInput: val, showActions: false })),
      debounceTime(250),
      switchMap(txt => txt !== '' ? this.fetchUsersByEmail(txt) : this.resetState()),
    );

    this.inputSource$.subscribe(({ data }) => {
      const { searchUsers } = data;
      this.setState({ suggestions: searchUsers, showList: true, searchingFor: '' });
    });
  }

  componentWillUnmount() {
    this.props.onClearCurrentSelectedTicket();
    this.inputSource$.unsubscribe();
  }

  render() {
    const { classes, assigning, assigningData, selectedTicket, loading } = this.props;
    const {
      assigneeFieldObj,
      suggestions,
      showList,
      searchingFor,
      textInput,
      showActions, } = this.state;
    let dynamicClasses = [classes.paper];

    if (assigning) {
      dynamicClasses.push(classes.cover);
    } else dynamicClasses = [classes.paper];

    let ticketDetail = null;

    if (loading && !selectedTicket) {
      ticketDetail = <Spinner />
    } else if (!selectedTicket) {
      ticketDetail = 'Browse ticket failed ...'
    } else {
      localStorage.setItem('selectedTicket', JSON.stringify(selectedTicket._id));
      const {
        title,
        label,
        description,
        hiPri,
        createdDate,
        creator,
        assignee } = selectedTicket;

      let assigneeField = null;
      if (assignee !== null) {
        assigneeField = <p><b>Assignee:</b> {' ' + assignee.email}</p>;
      } else if (assigningData) {
        assigneeField = <p><b>Assignee:</b> {' ' + assigningData.assignee.email}</p>;
      } else {
        assigneeField = (
          <ClickAwayListener onClickAway={this.handleClickAway}>
            <Autocomplete
              data={assigneeFieldObj}
              assign={this.onAssign}
              inputChanged={this.onHandleInputChanged}
              assigneeSelected={this.onSelectAssignee}
              inputFocused={() => this.setState({ showList: true })}
              showList={showList}
              suggestions={suggestions}
              searchingFor={searchingFor === '' ? '' : searchingFor}
              inputVal={textInput}
              showActions={showActions}
            />
          </ClickAwayListener>
        )
      }

      ticketDetail = (
        <Grid container spacing={16} className={classes.root}>
          {/* Title Section */}
          <Grid item xs={12} className={classes.header} order={1}>
            <h4 className={classes.headerText} style={{ margin: 0 }}>{title}</h4>
          </Grid>

          {/* Left Section */}
          <Grid item xs={12} lg={8} className={classes.item2}>
            <Grid container>
              {/* Ticket Details */}
              <Grid item xs={12}>
                <Paper className={classes.paper}>
                  <div className={classes.div}>
                    <b>Status:</b>
                    <Button color="primary" variant="contained" className={classes.button}>Ready To Start</Button>
                  </div>


                  <div className={classes.div}>
                    <b>Label:</b>
                    <Chip
                      avatar={<Avatar><ErrorOutlineRounded /></Avatar>}
                      label={label}
                      className={[classes.chip, classes.customChip].join(' ')}
                      color={label === 'develop' ? "primary" : "secondary"}
                    />
                  </div>


                  <div className={[classes.div, classes.centeringChildren].join(' ')}>
                    <b style={{ color: 'black' }}>Priority:</b>
                    <span
                      className={[classes.prio, classes.centeringChildren].join(' ')}
                      style={{ color: hiPri ? "red" : "blue" }}
                    >
                      {hiPri ? <ArrowDropUpRounded color="secondary" /> : <ArrowDropDownRounded color="primary" />}
                      {hiPri ? 'Urgent' : 'Normal'}
                    </span>
                  </div>
                </Paper>
              </Grid>

              {/* Ticket Description */}
              <Grid item xs={12}>
                <Paper className={classes.paper}>
                  <p><b>Description:</b> {description}</p>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Right Section */}
          <Grid item xs={12} lg={4} className={classes.item3}>
            <Grid container>
              <Grid item xs={12}>
                <Paper className={dynamicClasses.join(' ')}>
                  <p style={{ marginBottom: 0 }}><b>Reporter:</b> {creator.email}</p>
                  {assigneeField}
                  <p><b>Created At:</b> {new Date(+createdDate).toISOString().slice(0, 10)}</p>
                  <p><b>Updated At:</b> {new Date(+createdDate).toISOString().slice(0, 10)}</p>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )
    }

    return ticketDetail;
  }
}

const maptStateToProps = state => {
  return {
    selectedTicket: state.ticket.selectedTicket,
    loading: state.ticket.loading,
    error: state.ticket.error,
    userId: state.auth.userId,
    assigning: state.ticket.assigning,
    assigningData: state.ticket.assigningData
  }
}

const mapDispatchToProps = dispatch => {
  return {
    onBrowseTicket: id => dispatch(actions.browseTicket(id)),
    onClearCurrentSelectedTicket: () => dispatch(actions.clearCurrentSelectedTicket()),
    onAssignTicket: dataObj => dispatch(actions.assignTicket(dataObj))
  }
}

export default connect(maptStateToProps, mapDispatchToProps)(withStyles(styles)(Browse));
